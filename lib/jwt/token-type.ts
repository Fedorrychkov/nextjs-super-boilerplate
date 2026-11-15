export type TokenType = 'access' | 'refresh'

type ClaimsForType = { typ?: unknown; iat?: number; exp?: number }

/** Clock skew and the gap between `iat` and the `exp` jsonwebtoken writes. */
const LIFETIME_SLACK_SECONDS = 120

/**
 * Which kind of token this is. Both kinds are signed with the same secret, so before `typ`
 * existed a refresh token (it lives for days) passed `verifyAccessToken` and worked as a Bearer.
 *
 * Tokens issued before the claim have no `typ`. Rejecting them would sign everybody out on
 * deploy, so a token without `typ` is classified by its lifetime: an access token never lives
 * longer than the access TTL, a refresh token does. Legacy access tokens die within one access
 * TTL of the deploy; after that, every token without `typ` is a legacy refresh token.
 */
export function tokenTypeOf(claims: ClaimsForType, accessTtlSeconds: number): TokenType | null {
  if (claims.typ === 'access' || claims.typ === 'refresh') return claims.typ

  if (claims.typ !== undefined) return null

  if (typeof claims.iat !== 'number' || typeof claims.exp !== 'number') return null

  return claims.exp - claims.iat > accessTtlSeconds + LIFETIME_SLACK_SECONDS ? 'refresh' : 'access'
}
