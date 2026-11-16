import { createHash } from 'node:crypto'

/**
 * Read support for hashed refresh tokens. Keep writes in the old format until every instance
 * and rollback image can read hashes.
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
 * Matches either storage format while deployments transition.
 */
export function refreshTokenQuery(token: string): { token: { $in: string[] } } {
  return { token: { $in: [storedRefreshTokenValue(token), token] } }
}
