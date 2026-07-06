import type { UserRole } from '../user'

/**
 * Machine-authorization scopes for Personal Access Tokens (PAT).
 *
 * Extensibility contract: downstream projects add their own domain scopes here
 * (e.g. `orders:read`) — the middleware (`withApiTokenOrAuth`) and the admin UI
 * pick them up automatically from `API_TOKEN_SCOPES`.
 */
export const API_TOKEN_SCOPES = ['articles:read', 'articles:write', 'articles:publish', 'articles:seo', 'media:read', 'media:write'] as const

export type ApiTokenScope = (typeof API_TOKEN_SCOPES)[number]

/** Scopes granted to a new token when none are selected explicitly (safe default: no publish). */
export const API_TOKEN_DEFAULT_SCOPES: ApiTokenScope[] = ['articles:read', 'articles:write']

/**
 * Brand for all machine identifiers (`<brand>_pat_…`, `<brand>_oat_…`, `<brand>_mcp_client_…`).
 *
 * `NEXT_PUBLIC_` because this constant lives in the shared layer (used by both the backend and the UI
 * instructions on the token pages). Set once at project bootstrap, like `MCP_SERVER_NAME`.
 * ⚠️ Changing the brand on a live instance breaks detection of already issued tokens
 * (hashes stay valid, but the bearer `startsWith` check will no longer recognize the old prefix).
 */
export const API_TOKEN_BRAND = (process.env.NEXT_PUBLIC_API_TOKEN_BRAND || 'nsb').trim().replace(/_+$/, '') || 'nsb'

/** Raw PAT format: `<brand>_pat_<64 hex chars>`. The raw value is shown exactly once at creation. */
export const API_TOKEN_PREFIX = `${API_TOKEN_BRAND}_pat_`

/** Raw OAuth access token format: `<brand>_oat_<64 hex chars>` (issued by the MCP OAuth layer, never shown to humans). */
export const MCP_OAUTH_ACCESS_TOKEN_PREFIX = `${API_TOKEN_BRAND}_oat_`

/** DCR client identifiers: `<brand>_mcp_client_<32 hex chars>`. */
export const MCP_OAUTH_CLIENT_ID_PREFIX = `${API_TOKEN_BRAND}_mcp_client_`

/** How the token was issued: manually created PAT vs OAuth flow (Claude custom connector). */
export const API_TOKEN_KINDS = ['pat', 'oauth'] as const

export type ApiTokenKind = (typeof API_TOKEN_KINDS)[number]

/** True when the bearer looks like one of our machine tokens (PAT or OAuth access) — routes then take the token path instead of JWT. */
export function isApiTokenBearer(bearer: string | null | undefined): bearer is string {
  return Boolean(bearer && (bearer.startsWith(API_TOKEN_PREFIX) || bearer.startsWith(MCP_OAUTH_ACCESS_TOKEN_PREFIX)))
}

export type ApiTokenModel = {
  id: string
  name: string
  /** Display prefix, e.g. `nsb_pat_ab12cd34…` — never the full token. */
  prefix: string
  ownerUserId: string
  /** Effective role of the token. Never higher than the owner's role. */
  role: UserRole
  /** `pat` — manually created; `oauth` — issued by the MCP OAuth flow (e.g. a Claude connector). */
  kind: ApiTokenKind
  scopes: ApiTokenScope[]
  lastUsedAt?: string | null
  expiresAt: string
  revokedAt?: string | null
  createdBy?: string | null
  createdAt?: string | null
}

/** Returned once from the create endpoint. */
export type ApiTokenCreatedModel = {
  item: ApiTokenModel
  /** Raw token — displayed once, stored only as a hash. */
  token: string
}
