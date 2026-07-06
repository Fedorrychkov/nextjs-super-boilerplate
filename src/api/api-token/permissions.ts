import { UserRole } from '../user/model'
import { API_TOKEN_KINDS, API_TOKEN_SCOPES, type ApiTokenKind, type ApiTokenScope } from './model'

/**
 * Pure role→PAT permission logic, shared by the backend (service/routes) and the UI.
 *
 * Extensibility contract: roles are treated as plain strings so downstream projects can add
 * roles that do not exist in this boilerplate yet — an admin enables them via role policies
 * (`/admin/api-tokens`) without touching this file. Unknown roles are denied by default.
 */

export const API_TOKEN_DEFAULT_EXPIRES_DAYS = 90
/** Hard cap for any token lifetime, regardless of role policy. */
export const API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS = 365

/** Role policy as stored/edited by an admin. `role` is a free string for future roles. */
export type ApiTokenRolePolicyModel = {
  id?: string | null
  role: string
  enabled: boolean
  allowedScopes: ApiTokenScope[]
  /** Which auth channels the role may use: manual PATs and/or OAuth connections (MCP hosts). */
  allowedKinds: ApiTokenKind[]
  maxExpiresDays: number
  updatedAt?: string | null
}

/** Effective PAT permissions of a user role (admin is always fully allowed). */
export type ApiTokenPermissions = {
  allowed: boolean
  isAdmin: boolean
  role: string
  allowedScopes: ApiTokenScope[]
  allowedKinds: ApiTokenKind[]
  maxExpiresDays: number
}

export function isKnownApiTokenKind(kind: string): kind is ApiTokenKind {
  return (API_TOKEN_KINDS as readonly string[]).includes(kind)
}

/**
 * Normalizes a policy's `allowedKinds`. Policies created before the kind split have no field —
 * they behave as "both" (backwards compatible, matches the old semantics where an enabled
 * policy allowed every channel).
 */
export function normalizeApiTokenKinds(kinds: readonly string[] | null | undefined): ApiTokenKind[] {
  if (!kinds) {
    return [...API_TOKEN_KINDS]
  }

  const known = [...new Set(kinds)].filter(isKnownApiTokenKind)

  return known.length ? known : []
}

export function isKnownApiTokenScope(scope: string): scope is ApiTokenScope {
  return (API_TOKEN_SCOPES as readonly string[]).includes(scope)
}

/**
 * Role weights for the "token role never exceeds owner role" cap.
 * Unknown (future) roles weigh 0 — they can never grant more than themselves.
 */
const ROLE_WEIGHT: Record<string, number> = {
  [UserRole.ADMIN]: 3,
  [UserRole.EDITOR]: 2,
  [UserRole.USER]: 1,
}

/** Caps the token role at the owner's *current* role (handles owner demotion after issue). */
export function capApiTokenRole<T extends string>(tokenRole: T, ownerRole: T): T {
  return (ROLE_WEIGHT[tokenRole] ?? 0) > (ROLE_WEIGHT[ownerRole] ?? 0) ? ownerRole : tokenRole
}

/** Clamps a requested lifetime into `[1, min(maxDays, 365)]`; falls back to the default (90). */
export function clampExpiresDays(requested: number | null | undefined, maxDays: number): number {
  const max = Math.min(Math.max(1, Math.floor(maxDays || API_TOKEN_DEFAULT_EXPIRES_DAYS)), API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS)
  const fallback = Math.min(API_TOKEN_DEFAULT_EXPIRES_DAYS, max)

  if (typeof requested !== 'number' || !Number.isFinite(requested)) {
    return fallback
  }

  return Math.min(Math.max(1, Math.floor(requested)), max)
}

/** Deduplicated intersection of requested scopes with the allowed set; unknown scopes are dropped. */
export function filterApiTokenScopes(requested: readonly string[], allowed: readonly ApiTokenScope[]): ApiTokenScope[] {
  const allowedSet = new Set<string>(allowed)

  return [...new Set(requested)].filter(isKnownApiTokenScope).filter((scope) => allowedSet.has(scope))
}

/**
 * Resolves effective PAT permissions for a role from the stored policies.
 *
 * - `admin` — always allowed, all scopes, absolute max lifetime (policies cannot restrict admins).
 * - any other role — allowed only when an enabled policy with at least one known scope exists.
 */
export function resolveApiTokenPermissions(role: string, policies: readonly ApiTokenRolePolicyModel[]): ApiTokenPermissions {
  if (role === UserRole.ADMIN) {
    return {
      allowed: true,
      isAdmin: true,
      role,
      allowedScopes: [...API_TOKEN_SCOPES],
      allowedKinds: [...API_TOKEN_KINDS],
      maxExpiresDays: API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS,
    }
  }

  const policy = policies.find((item) => item.role === role)

  if (!policy?.enabled) {
    return { allowed: false, isAdmin: false, role, allowedScopes: [], allowedKinds: [], maxExpiresDays: 0 }
  }

  const allowedScopes = filterApiTokenScopes(policy.allowedScopes, API_TOKEN_SCOPES)
  // Missing field (pre-kind-split policies) → both channels; explicitly empty → nothing.
  const allowedKinds = normalizeApiTokenKinds(policy.allowedKinds)

  if (!allowedScopes.length || !allowedKinds.length) {
    return { allowed: false, isAdmin: false, role, allowedScopes: [], allowedKinds: [], maxExpiresDays: 0 }
  }

  return {
    allowed: true,
    isAdmin: false,
    role,
    allowedScopes,
    allowedKinds,
    maxExpiresDays: clampExpiresDays(policy.maxExpiresDays, API_TOKEN_ABSOLUTE_MAX_EXPIRES_DAYS),
  }
}
