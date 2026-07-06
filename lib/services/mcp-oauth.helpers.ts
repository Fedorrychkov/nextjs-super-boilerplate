import { createHash } from 'crypto'

/**
 * Pure OAuth 2.1 / MCP-authorization helpers — no DB, no env. Kept separate from the service
 * so they can be unit-tested directly (`mcp-oauth.helpers.test.ts`) and reused by routes.
 *
 * Spec anchors:
 * - MCP authorization (2025-06-18): PKCE S256 mandatory, RFC 8707 `resource`, RFC 9728 discovery.
 * - Claude specifics: hosted surfaces redirect to `https://claude.ai/api/mcp/auth_callback`;
 *   Claude Code uses RFC 8252 loopback (`http://localhost:<random port>/callback`,
 *   `http://127.0.0.1:<random port>/callback`) — the port MUST be ignored when matching.
 */

// #region PKCE

/** RFC 7636 §4.1: 43–128 chars of [A-Za-z0-9-._~]. */
const CODE_VERIFIER_RE = /^[A-Za-z0-9\-._~]{43,128}$/

/** RFC 7636 §4.2: base64url(sha256) is always 43 chars, no padding. */
const CODE_CHALLENGE_RE = /^[A-Za-z0-9\-_]{43}$/

export function isValidCodeChallenge(challenge: string): boolean {
  return CODE_CHALLENGE_RE.test(challenge)
}

/** S256: `base64url(sha256(code_verifier)) === code_challenge`. The only method we support (spec makes it mandatory). */
export function verifyPkceS256(codeVerifier: string, codeChallenge: string): boolean {
  if (!CODE_VERIFIER_RE.test(codeVerifier)) {
    return false
  }

  return createHash('sha256').update(codeVerifier).digest('base64url') === codeChallenge
}

// #endregion

// #region Redirect URIs

/** Loopback per RFC 8252: `http` is allowed only for localhost / 127.0.0.1 (Claude Code's native flow). */
export function isLoopbackRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri)

    return parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')
  } catch {
    return false
  }
}

/** A URI acceptable at registration: exact `https:` or loopback `http:`. Fragments are forbidden by OAuth 2.1. */
export function isRegistrableRedirectUri(uri: string): boolean {
  try {
    const parsed = new URL(uri)

    if (parsed.hash) {
      return false
    }

    return parsed.protocol === 'https:' || isLoopbackRedirectUri(uri)
  } catch {
    return false
  }
}

/**
 * OAuth 2.1 requires exact redirect_uri matching, with one carve-out: for loopback URIs the port
 * is assigned per-session (RFC 8252 §7.3), so it is ignored. Claude Code declares
 * `http://localhost/callback` + `http://127.0.0.1/callback` and calls back on an ephemeral port.
 */
export function matchRedirectUri(registered: readonly string[], requested: string): boolean {
  if (registered.includes(requested)) {
    return true
  }

  if (!isLoopbackRedirectUri(requested)) {
    return false
  }

  let requestedUrl: URL

  try {
    requestedUrl = new URL(requested)
  } catch {
    return false
  }

  return registered.some((candidate) => {
    if (!isLoopbackRedirectUri(candidate)) {
      return false
    }

    try {
      const candidateUrl = new URL(candidate)

      return candidateUrl.hostname === requestedUrl.hostname && candidateUrl.pathname === requestedUrl.pathname && candidateUrl.search === requestedUrl.search
    } catch {
      return false
    }
  })
}

// #endregion

// #region Resource indicator (RFC 8707)

/** Canonical URI of our MCP resource for a given public origin. */
export function canonicalMcpResource(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/api/mcp`
}

/**
 * Validates the `resource` parameter when present. Clients on spec 2025-06-18+ (Claude) always
 * send it; older clients may not — absence is tolerated, a mismatch is not.
 * Scheme/host are compared case-insensitively, trailing slash is ignored (RFC 8707 §2 guidance).
 */
export function isAcceptableResource(resource: string | null | undefined, origin: string): boolean {
  if (!resource) {
    return true
  }

  let requested: URL
  let canonical: URL

  try {
    requested = new URL(resource)
    canonical = new URL(canonicalMcpResource(origin))
  } catch {
    return false
  }

  if (requested.hash || requested.search) {
    return false
  }

  return (
    requested.protocol.toLowerCase() === canonical.protocol.toLowerCase() &&
    requested.host.toLowerCase() === canonical.host.toLowerCase() &&
    requested.pathname.replace(/\/+$/, '') === canonical.pathname
  )
}

// #endregion

// #region DCR

export type DcrRegistrationRequest = {
  redirect_uris?: unknown
  client_name?: unknown
  client_uri?: unknown
  logo_uri?: unknown
  grant_types?: unknown
  response_types?: unknown
  token_endpoint_auth_method?: unknown
}

export type DcrTokenEndpointAuthMethod = 'none' | 'client_secret_basic' | 'client_secret_post'

export type DcrValidationResult =
  | {
      ok: true
      redirectUris: string[]
      clientName: string
      clientUri: string | null
      logoUri: string | null
      /** RFC 7591 §2: omitted → `client_secret_basic` (confidential). Claude registers confidential clients. */
      tokenEndpointAuthMethod: DcrTokenEndpointAuthMethod
    }
  | { ok: false; error: 'invalid_redirect_uri' | 'invalid_client_metadata'; description: string }

const ALLOWED_GRANT_TYPES = new Set(['authorization_code', 'refresh_token'])
const ALLOWED_AUTH_METHODS: readonly DcrTokenEndpointAuthMethod[] = ['none', 'client_secret_basic', 'client_secret_post']
const MAX_REDIRECT_URIS = 10
const MAX_CLIENT_NAME_LENGTH = 120

/** Validates an RFC 7591 registration request against our (public-client, PKCE-only) policy. */
export function validateDcrRequest(body: DcrRegistrationRequest): DcrValidationResult {
  const redirectUrisRaw = body.redirect_uris

  if (!Array.isArray(redirectUrisRaw) || !redirectUrisRaw.length || redirectUrisRaw.length > MAX_REDIRECT_URIS) {
    return { ok: false, error: 'invalid_redirect_uri', description: `redirect_uris must be a non-empty array (max ${MAX_REDIRECT_URIS})` }
  }

  const redirectUris: string[] = []

  for (const uri of redirectUrisRaw) {
    if (typeof uri !== 'string' || !isRegistrableRedirectUri(uri)) {
      return { ok: false, error: 'invalid_redirect_uri', description: `redirect_uri must be https or loopback http without fragment: ${String(uri)}` }
    }

    redirectUris.push(uri)
  }

  if (Array.isArray(body.grant_types) && body.grant_types.some((grant) => typeof grant !== 'string' || !ALLOWED_GRANT_TYPES.has(grant))) {
    return { ok: false, error: 'invalid_client_metadata', description: 'grant_types may only include authorization_code and refresh_token' }
  }

  if (Array.isArray(body.response_types) && body.response_types.some((responseType) => responseType !== 'code')) {
    return { ok: false, error: 'invalid_client_metadata', description: 'response_types may only include "code"' }
  }

  // RFC 7591 default for an omitted method is client_secret_basic — we then issue a secret.
  const requestedAuthMethod = body.token_endpoint_auth_method === undefined ? 'client_secret_basic' : body.token_endpoint_auth_method

  if (typeof requestedAuthMethod !== 'string' || !(ALLOWED_AUTH_METHODS as readonly string[]).includes(requestedAuthMethod)) {
    return {
      ok: false,
      error: 'invalid_client_metadata',
      description: 'token_endpoint_auth_method must be one of: none, client_secret_basic, client_secret_post',
    }
  }

  const clientName = typeof body.client_name === 'string' && body.client_name.trim() ? body.client_name.trim().slice(0, MAX_CLIENT_NAME_LENGTH) : 'MCP client'
  const clientUri = typeof body.client_uri === 'string' && body.client_uri.startsWith('https://') ? body.client_uri : null
  const logoUri = typeof body.logo_uri === 'string' && body.logo_uri.startsWith('https://') ? body.logo_uri : null

  return { ok: true, redirectUris, clientName, clientUri, logoUri, tokenEndpointAuthMethod: requestedAuthMethod as DcrTokenEndpointAuthMethod }
}

// #endregion
