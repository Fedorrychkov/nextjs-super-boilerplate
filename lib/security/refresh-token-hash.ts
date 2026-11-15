import { createHash } from 'node:crypto'

/**
 * Refresh tokens are stored as a hash, not as the token. A refresh token is a full account login
 * for days; a database dump or a backup that leaks must not turn into a set of working sessions.
 * Lookup is by hash, so the server still finds the row for a token the client presents.
 *
 * The hash lives in the existing `token` field with an `h:` prefix instead of a new field: the
 * field already has a unique index in every deployed database, and rows without it would all
 * collide on `null` there. Same field, same index, no migration of the schema.
 */
const PREFIX = 'h:'

export function storedRefreshTokenValue(token: string): string {
  return `${PREFIX}${createHash('sha256').update(token).digest('hex')}`
}

export function isHashedRefreshTokenValue(value: string): boolean {
  return value.startsWith(PREFIX)
}

/**
 * Matches a row by the presented token: the hashed form, or the plain token in a row written
 * before hashing (until the startup pass or the next rotation rewrites it).
 */
export function refreshTokenQuery(token: string): { token: { $in: string[] } } {
  return { token: { $in: [storedRefreshTokenValue(token), token] } }
}
