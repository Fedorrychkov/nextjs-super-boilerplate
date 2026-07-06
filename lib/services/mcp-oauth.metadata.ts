import { API_TOKEN_SCOPES } from '~/api/api-token'

import { canonicalMcpResource } from './mcp-oauth.helpers'

/**
 * Discovery documents for the MCP OAuth contour (shared by the .well-known routes).
 * The app is both the Resource Server (`/api/mcp`) and the Authorization Server.
 */

/** RFC 9728 Protected Resource Metadata. */
export function buildProtectedResourceMetadata(origin: string) {
  return {
    resource: canonicalMcpResource(origin),
    authorization_servers: [origin],
    bearer_methods_supported: ['header'],
    scopes_supported: [...API_TOKEN_SCOPES],
  }
}

/** RFC 8414 Authorization Server Metadata. Public clients only — PKCE S256 instead of secrets. */
export function buildAuthorizationServerMetadata(origin: string) {
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/mcp/authorize`,
    token_endpoint: `${origin}/api/oauth/mcp/token`,
    registration_endpoint: `${origin}/api/oauth/mcp/register`,
    revocation_endpoint: `${origin}/api/oauth/mcp/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    // Claude's hosted surfaces register confidential clients (RFC 7591 default); CLI clients use `none` + PKCE.
    token_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],
    scopes_supported: [...API_TOKEN_SCOPES],
  }
}

/** Public origin from proxy-aware headers (same logic as the MCP route). */
export function resolvePublicOriginFromHeaders(headers: Headers, fallbackHost: string, fallbackProtocol: string): string {
  const host = headers.get('host') || fallbackHost
  const protocol = headers.get('x-forwarded-proto') || fallbackProtocol

  return `${protocol}://${host}`
}
