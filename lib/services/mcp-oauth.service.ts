import { MCP_OAUTH_CONFIG } from '@config/env'
import connectDB from '@lib/db/client'
import McpOAuthAuthorizationCode from '@lib/db/models/McpOAuthAuthorizationCode'
import McpOAuthClient, { IMcpOAuthClient } from '@lib/db/models/McpOAuthClient'
import McpOAuthGrant, { IMcpOAuthGrant } from '@lib/db/models/McpOAuthGrant'
import { randomBytes } from 'crypto'
import mongoose from 'mongoose'

import { type ApiTokenScope, MCP_OAUTH_CLIENT_ID_PREFIX } from '~/api/api-token'
import { clampExpiresDays, filterApiTokenScopes } from '~/api/api-token/permissions'

import { getApiTokenPermissionsForRole, hashApiToken, issueApiToken, revokeApiToken, verifyApiToken } from './api-token.service'
import { verifyPkceS256 } from './mcp-oauth.helpers'
import { recordSecurityAuditEvent } from './security-audit.service'

/**
 * DB layer of the MCP OAuth contour. The OAuth layer never decides permissions on its own:
 * it only mints regular `ApiToken`s (kind 'oauth') within the caller's `ApiTokenRolePolicy`,
 * so all enforcement stays in the existing PAT machinery.
 */

const AUTHORIZATION_CODE_TTL_MS = 60 * 1000

// #region Clients (DCR)

export async function registerMcpOAuthClient(params: {
  redirectUris: string[]
  clientName: string
  clientUri?: string | null
  logoUri?: string | null
  /** `none` → public client (PKCE only); otherwise a client_secret is issued and verified at the token endpoint. */
  tokenEndpointAuthMethod: 'none' | 'client_secret_basic' | 'client_secret_post'
}): Promise<{ client: IMcpOAuthClient; clientSecret: string | null }> {
  await connectDB()

  // Lazy cleanup instead of a TTL index: never deletes clients that issued at least one grant,
  // and respects env changes without index rebuilds. Fire-and-forget — no latency on register.
  const retentionMs = MCP_OAUTH_CONFIG.clientRetentionDays * 24 * 60 * 60 * 1000

  void McpOAuthClient.deleteMany({ grantsCount: 0, lastUsedAt: { $lt: new Date(Date.now() - retentionMs) } }).catch(() => undefined)

  const clientSecret = params.tokenEndpointAuthMethod === 'none' ? null : randomBytes(32).toString('base64url')

  const client = await McpOAuthClient.create({
    clientId: `${MCP_OAUTH_CLIENT_ID_PREFIX}${randomBytes(16).toString('hex')}`,
    clientName: params.clientName,
    tokenEndpointAuthMethod: params.tokenEndpointAuthMethod,
    clientSecretHash: clientSecret ? hashApiToken(clientSecret) : null,
    redirectUris: params.redirectUris,
    clientUri: params.clientUri ?? null,
    logoUri: params.logoUri ?? null,
  })

  // No security-audit event here: registration is anonymous by design (RFC 7591) and the audit
  // log requires a target user. Registrations are rate-limited and visible via `mcp_oauth_consent_*` later.
  return { client, clientSecret }
}

export async function getMcpOAuthClient(clientId: string): Promise<IMcpOAuthClient | null> {
  await connectDB()

  return McpOAuthClient.findOne({ clientId })
}

// #endregion

// #region Authorization codes

export type CreateAuthorizationCodeParams = {
  clientId: string
  userId: string
  redirectUri: string
  codeChallenge: string
  scopes: ApiTokenScope[]
  expiresDays: number
  resource?: string | null
}

/** Mints a one-time code (60s TTL). The raw code is returned once and stored only as sha256. */
export async function createMcpAuthorizationCode(params: CreateAuthorizationCodeParams): Promise<string> {
  await connectDB()

  const rawCode = randomBytes(32).toString('base64url')

  await McpOAuthAuthorizationCode.create({
    codeHash: hashApiToken(rawCode),
    clientId: params.clientId,
    userId: params.userId,
    redirectUri: params.redirectUri,
    codeChallenge: params.codeChallenge,
    scopes: params.scopes,
    expiresDays: params.expiresDays,
    resource: params.resource ?? null,
    expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_MS),
  })

  void McpOAuthClient.updateOne({ clientId: params.clientId }, { $set: { lastUsedAt: new Date() } }).catch(() => undefined)

  return rawCode
}

// #endregion

// #region Token grants

export type OAuthTokenErrorCode = 'invalid_request' | 'invalid_grant' | 'invalid_client'

export type IssuedTokens = {
  accessToken: string
  expiresInSeconds: number
  refreshToken: string
  scope: string
}

type TokenResult = { ok: true; value: IssuedTokens } | { ok: false; error: OAuthTokenErrorCode; description: string }

function tokenError(error: OAuthTokenErrorCode, description: string): TokenResult {
  return { ok: false, error, description }
}

/** Confidential clients must present their client_secret (Basic or form); public clients rely on PKCE. */
function verifyClientAuth(client: IMcpOAuthClient, clientSecret: string | null | undefined): boolean {
  if (!client.clientSecretHash) {
    return true
  }

  return Boolean(clientSecret) && hashApiToken(clientSecret as string) === client.clientSecretHash
}

async function mintGrantTokens(params: {
  userId: string
  clientId: string
  clientName: string
  scopes: ApiTokenScope[]
  grantExpiresAt: Date
  existingGrant?: IMcpOAuthGrant | null
}): Promise<IssuedTokens> {
  const accessTtlMs = MCP_OAUTH_CONFIG.accessTtlMinutes * 60 * 1000
  // Access token never outlives the grant itself.
  const accessExpiresAt = new Date(Math.min(Date.now() + accessTtlMs, params.grantExpiresAt.getTime()))
  const refreshToken = randomBytes(32).toString('base64url')

  if (params.existingGrant) {
    const grant = params.existingGrant
    const previousTokenId = grant.apiTokenId.toString()

    const { rawToken, item } = await issueApiToken({
      name: `Claude connector (${grant.clientName})`,
      ownerUserId: params.userId,
      scopes: params.scopes,
      kind: 'oauth',
      grantId: grant._id.toString(),
      expiresAtOverride: accessExpiresAt,
    })

    grant.prevRefreshTokenHash = grant.refreshTokenHash
    grant.refreshTokenHash = hashApiToken(refreshToken)
    grant.apiTokenId = new mongoose.Types.ObjectId(item.id)
    grant.lastRefreshedAt = new Date()
    await grant.save()

    // Revoke the superseded access token (system actor = the grant owner).
    await revokeApiToken(previousTokenId, params.userId)

    return {
      accessToken: rawToken,
      expiresInSeconds: Math.max(1, Math.floor((accessExpiresAt.getTime() - Date.now()) / 1000)),
      refreshToken,
      scope: params.scopes.join(' '),
    }
  }

  // New grant: create the grant first (token needs grantId), with a placeholder token id.
  const grant = await McpOAuthGrant.create({
    userId: params.userId,
    clientId: params.clientId,
    clientName: params.clientName,
    scopes: params.scopes,
    apiTokenId: new mongoose.Types.ObjectId(), // placeholder, replaced right below once the token exists
    refreshTokenHash: hashApiToken(refreshToken),
    expiresAt: params.grantExpiresAt,
  })

  const { rawToken, item } = await issueApiToken({
    name: `Claude connector (${params.clientName})`,
    ownerUserId: params.userId,
    scopes: params.scopes,
    kind: 'oauth',
    grantId: grant._id.toString(),
    expiresAtOverride: accessExpiresAt,
  })

  grant.apiTokenId = new mongoose.Types.ObjectId(item.id)
  await grant.save()

  await McpOAuthClient.updateOne({ clientId: params.clientId }, { $inc: { grantsCount: 1 }, $set: { lastUsedAt: new Date() } })

  return {
    accessToken: rawToken,
    expiresInSeconds: Math.max(1, Math.floor((accessExpiresAt.getTime() - Date.now()) / 1000)),
    refreshToken,
    scope: params.scopes.join(' '),
  }
}

async function revokeGrantCascade(grant: IMcpOAuthGrant, reason: string): Promise<void> {
  if (!grant.revokedAt) {
    grant.revokedAt = new Date()
    await grant.save()
  }

  const { default: ApiToken } = await import('@lib/db/models/ApiToken')

  await ApiToken.updateMany({ grantId: grant._id, revokedAt: null }, { $set: { revokedAt: new Date() } })

  void recordSecurityAuditEvent({
    action: 'mcp_oauth_grant_revoked',
    actorUserId: grant.userId.toString(),
    targetUserId: grant.userId.toString(),
    metadata: { grantId: grant._id.toString(), clientId: grant.clientId, reason },
  }).catch(() => undefined)
}

/** `grant_type=authorization_code`: code + PKCE → access (ApiToken) + refresh. */
export async function exchangeMcpAuthorizationCode(params: {
  code: string
  clientId: string
  clientSecret?: string | null
  redirectUri: string
  codeVerifier: string
}): Promise<TokenResult> {
  await connectDB()

  const codeDoc = await McpOAuthAuthorizationCode.findOne({ codeHash: hashApiToken(params.code) })

  if (!codeDoc) {
    return tokenError('invalid_grant', 'unknown or expired authorization code')
  }

  // Replay of an already exchanged code = interception: kill everything issued for it.
  if (codeDoc.usedAt) {
    if (codeDoc.usedByGrantId) {
      const grant = await McpOAuthGrant.findById(codeDoc.usedByGrantId)

      if (grant) {
        await revokeGrantCascade(grant, 'authorization_code_replay')
      }
    }

    return tokenError('invalid_grant', 'authorization code already used')
  }

  if (codeDoc.expiresAt.getTime() <= Date.now()) {
    return tokenError('invalid_grant', 'authorization code expired')
  }

  if (codeDoc.clientId !== params.clientId) {
    return tokenError('invalid_client', 'client_id does not match the authorization code')
  }

  if (codeDoc.redirectUri !== params.redirectUri) {
    return tokenError('invalid_grant', 'redirect_uri does not match the authorization request')
  }

  if (!verifyPkceS256(params.codeVerifier, codeDoc.codeChallenge)) {
    return tokenError('invalid_grant', 'PKCE verification failed')
  }

  // Re-check the role policy at exchange time: consent-time approval may have been narrowed since.
  const client = await getMcpOAuthClient(params.clientId)

  if (!client) {
    return tokenError('invalid_client', 'unknown client')
  }

  if (!verifyClientAuth(client, params.clientSecret)) {
    return tokenError('invalid_client', 'client authentication failed')
  }

  const { default: User } = await import('@lib/db/models/User')
  const owner = await User.findById(codeDoc.userId)

  if (!owner) {
    return tokenError('invalid_grant', 'user not found')
  }

  if (owner.machineAccessBlockedAt) {
    return tokenError('invalid_grant', 'machine access is blocked for this account')
  }

  const permissions = await getApiTokenPermissionsForRole(owner.role)

  if (!permissions.allowed || !permissions.allowedKinds.includes('oauth')) {
    return tokenError('invalid_grant', 'API tokens are not allowed for this role')
  }

  const scopes = filterApiTokenScopes(codeDoc.scopes, permissions.allowedScopes)

  if (!scopes.length) {
    return tokenError('invalid_grant', 'no approved scopes remain allowed by the role policy')
  }

  const days = clampExpiresDays(codeDoc.expiresDays, permissions.maxExpiresDays)
  const grantExpiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const tokens = await mintGrantTokens({
    userId: owner._id.toString(),
    clientId: client.clientId,
    clientName: client.clientName,
    scopes,
    grantExpiresAt,
  })

  const grant = await McpOAuthGrant.findOne({ refreshTokenHash: hashApiToken(tokens.refreshToken) })

  codeDoc.usedAt = new Date()
  codeDoc.usedByGrantId = grant?._id ?? null
  await codeDoc.save()

  void recordSecurityAuditEvent({
    action: 'mcp_oauth_tokens_issued',
    actorUserId: owner._id.toString(),
    targetUserId: owner._id.toString(),
    metadata: { clientId: client.clientId, scopes: scopes.join(','), grantExpiresAt: grantExpiresAt.toISOString() },
  }).catch(() => undefined)

  return { ok: true, value: tokens }
}

/** `grant_type=refresh_token`: rotation + replay detection. Dead refresh → strictly `invalid_grant` (Claude reconnects on it). */
export async function refreshMcpGrant(params: { refreshToken: string; clientId: string; clientSecret?: string | null }): Promise<TokenResult> {
  await connectDB()

  const hash = hashApiToken(params.refreshToken)
  const grant = await McpOAuthGrant.findOne({ refreshTokenHash: hash })

  if (!grant) {
    // Rotated-token replay: the presented refresh was already exchanged once — treat as theft.
    const replayed = await McpOAuthGrant.findOne({ prevRefreshTokenHash: hash })

    if (replayed) {
      await revokeGrantCascade(replayed, 'refresh_token_replay')
    }

    return tokenError('invalid_grant', 'unknown refresh token')
  }

  if (grant.revokedAt) {
    return tokenError('invalid_grant', 'grant revoked')
  }

  if (grant.expiresAt.getTime() <= Date.now()) {
    return tokenError('invalid_grant', 'grant expired')
  }

  if (grant.clientId !== params.clientId) {
    return tokenError('invalid_client', 'client_id does not match the grant')
  }

  // Confidential clients authenticate on refresh too. A missing client record (should not happen —
  // cleanup never touches clients with grants) degrades to public: the refresh token itself is the proof.
  const grantClient = await getMcpOAuthClient(grant.clientId)

  if (grantClient && !verifyClientAuth(grantClient, params.clientSecret)) {
    return tokenError('invalid_client', 'client authentication failed')
  }

  const { default: User } = await import('@lib/db/models/User')
  const owner = await User.findById(grant.userId)

  if (!owner) {
    return tokenError('invalid_grant', 'user not found')
  }

  if (owner.machineAccessBlockedAt) {
    return tokenError('invalid_grant', 'machine access is blocked for this account')
  }

  // Role policy is re-applied on every refresh, so narrowing propagates within one access TTL.
  const permissions = await getApiTokenPermissionsForRole(owner.role)

  if (!permissions.allowed || !permissions.allowedKinds.includes('oauth')) {
    return tokenError('invalid_grant', 'API tokens are not allowed for this role')
  }

  const scopes = filterApiTokenScopes(grant.scopes, permissions.allowedScopes)

  if (!scopes.length) {
    return tokenError('invalid_grant', 'no granted scopes remain allowed by the role policy')
  }

  const tokens = await mintGrantTokens({
    userId: owner._id.toString(),
    clientId: grant.clientId,
    clientName: grant.clientName,
    scopes,
    grantExpiresAt: grant.expiresAt,
    existingGrant: grant,
  })

  return { ok: true, value: tokens }
}

/** RFC 7009: best-effort revocation of an access or refresh token. Always succeeds from the caller's perspective. */
export async function revokeMcpToken(rawToken: string): Promise<void> {
  await connectDB()

  const hash = hashApiToken(rawToken)

  const grantByRefresh = await McpOAuthGrant.findOne({ $or: [{ refreshTokenHash: hash }, { prevRefreshTokenHash: hash }] })

  if (grantByRefresh) {
    await revokeGrantCascade(grantByRefresh, 'rfc7009_revocation')

    return
  }

  // Maybe it's an access token (ApiToken with a grant back-reference).
  const verified = await verifyApiToken(rawToken)

  if (verified.ok && verified.value.token.grantId) {
    const grant = await McpOAuthGrant.findById(verified.value.token.grantId)

    if (grant) {
      await revokeGrantCascade(grant, 'rfc7009_revocation')

      return
    }
  }

  if (verified.ok && verified.value.token.kind === 'oauth') {
    await revokeApiToken(verified.value.token._id.toString(), verified.value.owner._id.toString())
  }
}

// #endregion
