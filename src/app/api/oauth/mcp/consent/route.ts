import { MCP_OAUTH_CONFIG } from '@config/env'
import { withGlobalRateLimit } from '@lib/middleware'
import { authMiddleware } from '@lib/security/auth'
import { getApiTokenPermissionsForRole } from '@lib/services/api-token.service'
import { isAcceptableResource, isValidCodeChallenge, matchRedirectUri } from '@lib/services/mcp-oauth.helpers'
import { createMcpAuthorizationCode, getMcpOAuthClient } from '@lib/services/mcp-oauth.service'
import { recordSecurityAuditEvent } from '@lib/services/security-audit.service'
import { NextRequest, NextResponse } from 'next/server'

import { clampExpiresDays, filterApiTokenScopes } from '~/api/api-token/permissions'

/**
 * Consent decision endpoint, called by the consent screen (`/oauth/mcp/authorize`) on behalf of a
 * logged-in user (regular JWT cookie auth — PATs are deliberately NOT accepted here: a machine
 * token must not be able to approve new grants).
 *
 * Everything from the authorize request is re-validated server-side — the page's hidden fields
 * are untrusted input. Returns `{ redirectUrl }` for the browser to navigate to (either
 * `?code=…&state=…` or `?error=access_denied&state=…`).
 */
const handler = async (request: NextRequest): Promise<NextResponse> => {
  if (!MCP_OAUTH_CONFIG.enabled) {
    return NextResponse.json({ message: 'MCP OAuth is disabled on this server' }, { status: 404 })
  }

  const auth = await authMiddleware(request)

  if (!auth.success) {
    return auth.response
  }

  let body: {
    decision?: unknown
    clientId?: unknown
    redirectUri?: unknown
    state?: unknown
    codeChallenge?: unknown
    scopes?: unknown
    expiresDays?: unknown
    resource?: unknown
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'body must be JSON' }, { status: 400 })
  }

  const decision = body.decision === 'approve' ? 'approve' : 'deny'
  const clientId = typeof body.clientId === 'string' ? body.clientId.trim() : ''
  const redirectUri = typeof body.redirectUri === 'string' ? body.redirectUri : ''
  const state = typeof body.state === 'string' ? body.state : ''
  const codeChallenge = typeof body.codeChallenge === 'string' ? body.codeChallenge : ''
  const resource = typeof body.resource === 'string' && body.resource ? body.resource : null

  const client = clientId ? await getMcpOAuthClient(clientId) : null

  // Never redirect to an unvalidated URI (open-redirect defense) — hard 400 instead.
  if (!client || !redirectUri || !matchRedirectUri(client.redirectUris, redirectUri)) {
    return NextResponse.json({ message: 'unknown client or unregistered redirect_uri' }, { status: 400 })
  }

  const redirect = new URL(redirectUri)

  if (state) {
    redirect.searchParams.set('state', state)
  }

  if (decision === 'deny') {
    redirect.searchParams.set('error', 'access_denied')

    void recordSecurityAuditEvent({
      action: 'mcp_oauth_consent_denied',
      actorUserId: auth.payload.sub,
      targetUserId: auth.payload.sub,
      metadata: { clientId },
    }).catch(() => undefined)

    return NextResponse.json({ redirectUrl: redirect.toString() })
  }

  if (!isValidCodeChallenge(codeChallenge)) {
    return NextResponse.json({ message: 'invalid PKCE code_challenge' }, { status: 400 })
  }

  const origin = `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host') || request.nextUrl.host}`

  if (!isAcceptableResource(resource, origin)) {
    return NextResponse.json({ message: 'resource does not match this MCP server' }, { status: 400 })
  }

  // Per-user machine-access kill-switch beats everything else.
  const { default: User } = await import('@lib/db/models/User')
  const consentUser = await User.findById(auth.payload.sub)

  if (!consentUser || consentUser.machineAccessBlockedAt) {
    return NextResponse.json({ message: 'machine access is blocked for this account' }, { status: 403 })
  }

  // Role policy is the source of truth — requested scopes/lifetime are clamped, never trusted.
  const permissions = await getApiTokenPermissionsForRole(auth.payload.role)

  if (!permissions.allowed || !permissions.allowedKinds.includes('oauth')) {
    return NextResponse.json({ message: 'API tokens are not allowed for your role' }, { status: 403 })
  }

  const requestedScopes = Array.isArray(body.scopes) ? body.scopes.filter((scope): scope is string => typeof scope === 'string') : []
  const scopes = filterApiTokenScopes(requestedScopes, permissions.allowedScopes)

  if (!scopes.length) {
    return NextResponse.json({ message: 'select at least one allowed scope' }, { status: 400 })
  }

  const expiresDays = clampExpiresDays(typeof body.expiresDays === 'number' ? body.expiresDays : undefined, permissions.maxExpiresDays)

  const code = await createMcpAuthorizationCode({
    clientId,
    userId: auth.payload.sub,
    redirectUri,
    codeChallenge,
    scopes,
    expiresDays,
    resource,
  })

  redirect.searchParams.set('code', code)

  void recordSecurityAuditEvent({
    action: 'mcp_oauth_consent_granted',
    actorUserId: auth.payload.sub,
    targetUserId: auth.payload.sub,
    metadata: { clientId, scopes: scopes.join(','), expiresDays: String(expiresDays) },
  }).catch(() => undefined)

  return NextResponse.json({ redirectUrl: redirect.toString() })
}

export const POST = withGlobalRateLimit(handler)
