import { MCP_OAUTH_CONFIG } from '@config/env'
import { withGlobalRateLimit } from '@lib/middleware'
import { getClientKey, rateLimit } from '@lib/security/rate-limit'
import { type DcrRegistrationRequest, validateDcrRequest } from '@lib/services/mcp-oauth.helpers'
import { registerMcpOAuthClient } from '@lib/services/mcp-oauth.service'
import { NextRequest, NextResponse } from 'next/server'

/**
 * RFC 7591 Dynamic Client Registration. Anonymous by spec (MCP hosts register before any user
 * exists), so it is deliberately strict: public clients only (no secret is ever issued — PKCE),
 * https/loopback redirect URIs, tight per-IP rate limit. Claude.ai/Desktop registers a fresh
 * client per connection; stale unused clients are lazily cleaned up by the service.
 *
 * Errors follow RFC 7591 §3.2.2 (`error` / `error_description`).
 */
const handler = async (request: NextRequest): Promise<NextResponse> => {
  if (!MCP_OAUTH_CONFIG.enabled) {
    return NextResponse.json({ message: 'MCP OAuth is disabled on this server' }, { status: 404 })
  }

  // Stricter than the global limiter: registration creates DB records without any auth.
  const clientKey = getClientKey(request)

  if (clientKey) {
    try {
      await rateLimit.consume(`mcp-oauth:register:${clientKey}`, 5)
    } catch {
      return NextResponse.json({ error: 'invalid_client_metadata', error_description: 'too many registration attempts' }, { status: 429 })
    }
  }

  let body: DcrRegistrationRequest

  try {
    body = (await request.json()) as DcrRegistrationRequest
  } catch {
    return NextResponse.json({ error: 'invalid_client_metadata', error_description: 'body must be JSON' }, { status: 400 })
  }

  const validated = validateDcrRequest(body)

  if (!validated.ok) {
    return NextResponse.json({ error: validated.error, error_description: validated.description }, { status: 400 })
  }

  const { client, clientSecret } = await registerMcpOAuthClient({
    redirectUris: validated.redirectUris,
    clientName: validated.clientName,
    clientUri: validated.clientUri,
    logoUri: validated.logoUri,
    tokenEndpointAuthMethod: validated.tokenEndpointAuthMethod,
  })

  return NextResponse.json(
    {
      client_id: client.clientId,
      client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
      // Confidential clients (RFC 7591 default — what Claude's hosted surfaces register as) get a secret.
      ...(clientSecret ? { client_secret: clientSecret, client_secret_expires_at: 0 } : {}),
      client_name: client.clientName,
      redirect_uris: client.redirectUris,
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: client.tokenEndpointAuthMethod,
    },
    { status: 201 },
  )
}

export const POST = withGlobalRateLimit(handler)
