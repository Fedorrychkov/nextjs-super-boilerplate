import type { ApiTokenKind, ApiTokenScope } from './model'

export type ApiTokenFilter = {
  limit?: number
  offset?: number
  /** `active` — not revoked and not expired; `revoked`; `expired`. */
  status?: 'active' | 'revoked' | 'expired' | string
  /** Server-side only: non-admins are always restricted to their own tokens. */
  ownerUserId?: string
}

export type ApiTokenCreatePayload = {
  name: string
  scopes: ApiTokenScope[]
  /** Days until expiration (default 90, max 365; further capped by the caller's role policy). */
  expiresInDays?: number
}

/** Admin payload for enabling/tuning PAT issuance for a role (any string — future roles included). */
export type ApiTokenRolePolicyUpdatePayload = {
  role: string
  enabled: boolean
  allowedScopes: ApiTokenScope[]
  /** Auth channels for the role (`pat` — manual tokens, `oauth` — MCP-host connections). Omitted → both. */
  allowedKinds?: ApiTokenKind[]
  maxExpiresDays?: number
}

/** Response of `GET /api/v1/api-token/permissions` for the current user. */
export type ApiTokenPermissionsModel = {
  /** Feature flag `API_TOKENS_ENABLED` state — when false everything else is empty. */
  enabled: boolean
  /** `MCP_OAUTH_ENABLED` state — drives the "connect Claude by URL" instructions on the token pages. */
  mcpOauthEnabled: boolean
  allowed: boolean
  isAdmin: boolean
  role: string
  allowedScopes: ApiTokenScope[]
  allowedKinds: ApiTokenKind[]
  maxExpiresDays: number
}
