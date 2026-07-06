import { MCP_OAUTH_CONFIG } from '@config/env'
import { withGlobalRateLimit } from '@lib/middleware'
import { getClientKey, rateLimit } from '@lib/security/rate-limit'
import { isAcceptableResource } from '@lib/services/mcp-oauth.helpers'
import { exchangeMcpAuthorizationCode, refreshMcpGrant } from '@lib/services/mcp-oauth.service'
import { NextRequest, NextResponse } from 'next/server'

/**
 * OAuth 2.1 token endpoint (`application/x-www-form-urlencoded`, public clients + PKCE).
 *
 * Grants:
 * - `authorization_code` → access token (a regular ApiToken, kind 'oauth') + refresh token.
 * - `refresh_token` → rotation; replay of a rotated token revokes the whole grant.
 *
 * Error codes are strictly RFC 6749 (`invalid_grant` on any dead refresh token — Claude relies
 * on that exact code to know it must re-run the authorization flow).
 */
const handler = async (request: NextRequest): Promise<NextResponse> => {
  if (!MCP_OAUTH_CONFIG.enabled) {
    return NextResponse.json({ message: 'MCP OAuth is disabled on this server' }, { status: 404 })
  }

  const clientKey = getClientKey(request)

  if (clientKey) {
    try {
      // Stricter than the global limiter: this endpoint is the brute-force surface for codes and refresh tokens.
      await rateLimit.consume(`mcp-oauth:token:${clientKey}`, 3)
    } catch {
      return NextResponse.json({ error: 'invalid_request', error_description: 'too many token requests' }, { status: 429 })
    }
  }

  let form: URLSearchParams

  try {
    form = new URLSearchParams(await request.text())
  } catch {
    return NextResponse.json({ error: 'invalid_request', error_description: 'body must be application/x-www-form-urlencoded' }, { status: 400 })
  }

  const grantType = form.get('grant_type')
  const resource = form.get('resource')

  // Client credentials: HTTP Basic (client_secret_basic) takes precedence, then form fields (client_secret_post / public).
  let clientId = (form.get('client_id') || '').trim()
  let clientSecret: string | null = form.get('client_secret')

  const authHeader = request.headers.get('authorization')

  if (authHeader?.startsWith('Basic ')) {
    try {
      const [basicId, ...secretParts] = Buffer.from(authHeader.slice('Basic '.length), 'base64').toString('utf8').split(':')

      clientId = decodeURIComponent(basicId || '') || clientId
      clientSecret = decodeURIComponent(secretParts.join(':') || '') || clientSecret
    } catch {
      return NextResponse.json({ error: 'invalid_client', error_description: 'malformed Basic authorization header' }, { status: 401 })
    }
  }

  if (!clientId) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'client_id is required' }, { status: 400 })
  }

  // RFC 8707: tokens are bound to our MCP resource; a mismatching resource indicator is rejected.
  const origin = resolvePublicOrigin(request)

  if (!isAcceptableResource(resource, origin)) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'resource does not match this MCP server' }, { status: 400 })
  }

  if (grantType === 'authorization_code') {
    const code = form.get('code') || ''
    const codeVerifier = form.get('code_verifier') || ''
    const redirectUri = form.get('redirect_uri') || ''

    if (!code || !codeVerifier || !redirectUri) {
      return NextResponse.json({ error: 'invalid_request', error_description: 'code, code_verifier and redirect_uri are required' }, { status: 400 })
    }

    const result = await exchangeMcpAuthorizationCode({ code, clientId, clientSecret, redirectUri, codeVerifier })

    if (!result.ok) {
      return NextResponse.json({ error: result.error, error_description: result.description }, { status: 400 })
    }

    return tokenResponse(result.value)
  }

  if (grantType === 'refresh_token') {
    const refreshToken = form.get('refresh_token') || ''

    if (!refreshToken) {
      return NextResponse.json({ error: 'invalid_request', error_description: 'refresh_token is required' }, { status: 400 })
    }

    const result = await refreshMcpGrant({ refreshToken, clientId, clientSecret })

    if (!result.ok) {
      return NextResponse.json({ error: result.error, error_description: result.description }, { status: 400 })
    }

    return tokenResponse(result.value)
  }

  return NextResponse.json({ error: 'unsupported_grant_type', error_description: 'use authorization_code or refresh_token' }, { status: 400 })
}

function tokenResponse(tokens: { accessToken: string; expiresInSeconds: number; refreshToken: string; scope: string }): NextResponse {
  return NextResponse.json(
    {
      access_token: tokens.accessToken,
      token_type: 'Bearer',
      expires_in: tokens.expiresInSeconds,
      refresh_token: tokens.refreshToken,
      scope: tokens.scope,
    },
    // RFC 6749 §5.1: token responses must not be cached.
    { headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' } },
  )
}

function resolvePublicOrigin(request: NextRequest): string {
  const host = request.headers.get('host') || request.nextUrl.host
  const protocol = request.headers.get('x-forwarded-proto') || (request.nextUrl.protocol ? request.nextUrl.protocol.replace(':', '') : 'https')

  return `${protocol}://${host}`
}

export const POST = withGlobalRateLimit(handler)
