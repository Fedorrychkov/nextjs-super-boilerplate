import connectDB from '@lib/db/client'
import ApiToken, { IApiToken } from '@lib/db/models/ApiToken'
import ApiTokenRolePolicy, { IApiTokenRolePolicy } from '@lib/db/models/ApiTokenRolePolicy'
import User, { IUser } from '@lib/db/models/User'
import { createHash, randomBytes } from 'crypto'
import mongoose from 'mongoose'

import {
  API_TOKEN_PREFIX,
  API_TOKEN_SCOPES,
  type ApiTokenFilter,
  type ApiTokenKind,
  type ApiTokenModel,
  type ApiTokenScope,
  MCP_OAUTH_ACCESS_TOKEN_PREFIX,
} from '~/api/api-token'
import {
  API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS,
  API_TOKEN_DEFAULT_EXPIRES_DAYS,
  type ApiTokenPermissions,
  type ApiTokenRolePolicyModel,
  capApiTokenRole,
  clampExpiresDays,
  filterApiTokenScopes,
  isKnownApiTokenScope,
  normalizeApiTokenKinds,
  resolveApiTokenPermissions,
} from '~/api/api-token/permissions'
import { UserRole, UserStatus } from '~/api/user'
import type { PaginationMeta } from '~/types/pagination'

import { recordSecurityAuditEvent } from './security-audit.service'

export { API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS, API_TOKEN_DEFAULT_EXPIRES_DAYS, isKnownApiTokenScope }

export function hashApiToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex')
}

export function mapApiTokenItem(doc: IApiToken): ApiTokenModel {
  return {
    id: doc._id.toString(),
    name: doc.name,
    prefix: doc.prefix,
    ownerUserId: doc.ownerUserId.toString(),
    role: doc.role,
    kind: doc.kind || 'pat',
    scopes: doc.scopes.filter(isKnownApiTokenScope),
    lastUsedAt: doc.lastUsedAt ? new Date(doc.lastUsedAt).toISOString() : null,
    expiresAt: new Date(doc.expiresAt).toISOString(),
    revokedAt: doc.revokedAt ? new Date(doc.revokedAt).toISOString() : null,
    createdBy: doc.createdBy?.toString() ?? null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  }
}

function mapPolicyItem(doc: IApiTokenRolePolicy): ApiTokenRolePolicyModel {
  return {
    id: doc._id.toString(),
    role: doc.role,
    enabled: doc.enabled,
    allowedScopes: doc.allowedScopes.filter(isKnownApiTokenScope),
    allowedKinds: normalizeApiTokenKinds(doc.allowedKinds),
    maxExpiresDays: doc.maxExpiresDays,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
  }
}

// #region Role policies

export async function listApiTokenRolePolicies(): Promise<ApiTokenRolePolicyModel[]> {
  await connectDB()

  const list = await ApiTokenRolePolicy.find({}).sort({ role: 1 }).exec()

  return list.map(mapPolicyItem)
}

export async function upsertApiTokenRolePolicy(params: {
  role: string
  enabled: boolean
  allowedScopes: string[]
  allowedKinds?: string[]
  maxExpiresDays?: number
  actorUserId: string
}): Promise<ApiTokenRolePolicyModel> {
  await connectDB()

  const role = params.role.trim().toLowerCase()

  if (!role || role === UserRole.ADMIN) {
    // Admins are always fully allowed; their policy is immutable by design.
    throw new Error('Invalid role for API token policy')
  }

  const allowedScopes = filterApiTokenScopes(params.allowedScopes, API_TOKEN_SCOPES)
  // Omitted → keep old semantics (both channels). Explicit empty array = role keeps policy but can't use any channel.
  const allowedKinds = params.allowedKinds === undefined ? normalizeApiTokenKinds(undefined) : normalizeApiTokenKinds(params.allowedKinds)
  const maxExpiresDays = clampExpiresDays(params.maxExpiresDays, API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS)

  const doc = await ApiTokenRolePolicy.findOneAndUpdate(
    { role },
    { $set: { enabled: params.enabled, allowedScopes, allowedKinds, maxExpiresDays, updatedBy: params.actorUserId } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  )

  await recordSecurityAuditEvent({
    action: 'api_token_policy_updated',
    actorUserId: params.actorUserId,
    targetUserId: params.actorUserId,
    metadata: {
      role,
      enabled: String(params.enabled),
      allowedScopes: allowedScopes.join(','),
      allowedKinds: allowedKinds.join(','),
      maxExpiresDays: String(maxExpiresDays),
    },
  })

  return mapPolicyItem(doc)
}

/** Effective PAT permissions for a role. Admin never hits the DB. */
export async function getApiTokenPermissionsForRole(role: string): Promise<ApiTokenPermissions> {
  if (role === UserRole.ADMIN) {
    return resolveApiTokenPermissions(role, [])
  }

  await connectDB()

  const policy = await ApiTokenRolePolicy.findOne({ role: role.trim().toLowerCase() })

  return resolveApiTokenPermissions(role, policy ? [mapPolicyItem(policy)] : [])
}

// #endregion

// #region Tokens

export async function issueApiToken(params: {
  name: string
  ownerUserId: string
  scopes: ApiTokenScope[]
  expiresInDays?: number
  createdBy?: string | null
  /** `oauth` tokens are minted by the MCP OAuth layer with `<brand>_oat_` prefix and an exact `expiresAtOverride`. */
  kind?: ApiTokenKind
  grantId?: string | null
  /** Exact expiry (used for short-lived OAuth access tokens); when set, `expiresInDays` is ignored. */
  expiresAtOverride?: Date
}): Promise<{ rawToken: string; item: ApiTokenModel }> {
  await connectDB()

  const owner = await User.findById(params.ownerUserId)

  if (!owner) {
    throw new Error('API token owner not found')
  }

  const kind: ApiTokenKind = params.kind ?? 'pat'
  const prefix = kind === 'oauth' ? MCP_OAUTH_ACCESS_TOKEN_PREFIX : API_TOKEN_PREFIX
  const rawToken = `${prefix}${randomBytes(32).toString('hex')}`
  const days = clampExpiresDays(params.expiresInDays, API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS)
  const expiresAt = params.expiresAtOverride ?? new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  const doc = await ApiToken.create({
    name: params.name.trim(),
    tokenHash: hashApiToken(rawToken),
    prefix: `${rawToken.slice(0, prefix.length + 8)}…`,
    ownerUserId: owner._id,
    // Snapshot of the owner's role at issue time; re-capped at verify time in case the owner is demoted later.
    role: owner.role,
    kind,
    grantId: params.grantId ? new mongoose.Types.ObjectId(params.grantId) : null,
    scopes: params.scopes.filter(isKnownApiTokenScope),
    expiresAt,
    createdBy: params.createdBy ?? params.ownerUserId,
  })

  await recordSecurityAuditEvent({
    action: 'api_token_created',
    actorUserId: params.createdBy ?? params.ownerUserId,
    targetUserId: params.ownerUserId,
    metadata: { tokenId: doc._id.toString(), name: doc.name, scopes: doc.scopes.join(','), expiresAt: expiresAt.toISOString() },
  })

  return { rawToken, item: mapApiTokenItem(doc) }
}

export type VerifiedApiToken = {
  token: IApiToken
  owner: IUser
  /** Owner's current role capped over the issue-time snapshot (owner demotion propagates instantly). */
  effectiveRole: UserRole
  /** Token scopes intersected with the owner's current role policy (policy changes propagate instantly). */
  effectiveScopes: ApiTokenScope[]
}

export type ApiTokenVerifyError = 'invalid' | 'revoked' | 'expired' | 'owner_inactive' | 'role_not_allowed' | 'kind_not_allowed' | 'machine_access_blocked'

export async function verifyApiToken(rawToken: string): Promise<{ ok: true; value: VerifiedApiToken } | { ok: false; reason: ApiTokenVerifyError }> {
  await connectDB()

  const token = await ApiToken.findOne({ tokenHash: hashApiToken(rawToken) })

  if (!token) {
    return { ok: false, reason: 'invalid' }
  }

  if (token.revokedAt) {
    return { ok: false, reason: 'revoked' }
  }

  if (token.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: 'expired' }
  }

  const owner = await User.findById(token.ownerUserId)

  if (!owner || owner.status !== UserStatus.ACTIVE) {
    return { ok: false, reason: 'owner_inactive' }
  }

  // Per-user kill-switch (abuse / overload): blocks every machine request of this user instantly.
  if (owner.machineAccessBlockedAt) {
    return { ok: false, reason: 'machine_access_blocked' }
  }

  // Role policy is enforced on every request: disabling a role or narrowing its scopes
  // in /admin/api-tokens takes effect immediately for all existing tokens of that role.
  const permissions = await getApiTokenPermissionsForRole(owner.role)

  if (!permissions.allowed) {
    return { ok: false, reason: 'role_not_allowed' }
  }

  // Auth-channel policy: e.g. a role may be allowed OAuth connections but not manual PATs (or vice versa).
  if (!permissions.allowedKinds.includes(token.kind || 'pat')) {
    return { ok: false, reason: 'kind_not_allowed' }
  }

  const effectiveScopes = filterApiTokenScopes(token.scopes, permissions.allowedScopes)

  // Fire-and-forget: do not add latency to the request path.
  void ApiToken.updateOne({ _id: token._id }, { $set: { lastUsedAt: new Date() } }).catch(() => undefined)

  return {
    ok: true,
    value: {
      token,
      owner,
      effectiveRole: capApiTokenRole(token.role, owner.role),
      effectiveScopes,
    },
  }
}

export async function revokeApiToken(id: string, actorUserId: string, options?: { restrictToOwnerId?: string }): Promise<ApiTokenModel | null> {
  await connectDB()

  const token = await ApiToken.findById(id)

  if (!token) {
    return null
  }

  // Non-admins may only revoke their own tokens; behaves as "not found" to avoid leaking token existence.
  if (options?.restrictToOwnerId && token.ownerUserId.toString() !== options.restrictToOwnerId) {
    return null
  }

  if (!token.revokedAt) {
    token.revokedAt = new Date()
    await token.save()

    // OAuth access token → also kill the grant, otherwise the host would silently mint a new access via refresh_token.
    if (token.grantId) {
      const { default: McpOAuthGrant } = await import('@lib/db/models/McpOAuthGrant')

      await McpOAuthGrant.updateOne({ _id: token.grantId, revokedAt: null }, { $set: { revokedAt: new Date() } })
    }

    await recordSecurityAuditEvent({
      action: 'api_token_revoked',
      actorUserId,
      targetUserId: token.ownerUserId.toString(),
      metadata: { tokenId: token._id.toString(), name: token.name, kind: token.kind || 'pat' },
    })
  }

  return mapApiTokenItem(token)
}

export async function listApiTokens(filter: ApiTokenFilter): Promise<PaginationMeta<ApiTokenModel>> {
  await connectDB()

  const page = await ApiToken.findListPaginated(filter)

  return {
    ...page,
    list: page.list.map((doc) => mapApiTokenItem(doc)),
  }
}

// #endregion
