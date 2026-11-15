import { UserRole, UserStatus } from '~/api/user/model'

/** What the API trusts about the caller: read from the database, not from the JWT. */
export type AccessSnapshot = {
  role: UserRole
  status: UserStatus
  email: string
}

/**
 * Short on purpose: it is the upper bound on how long a demoted, blocked or signed-out user keeps
 * API access in another process if an invalidation is ever missed. Invalidation itself is
 * immediate (the generation counter below).
 */
export const ACCESS_SNAPSHOT_TTL_SECONDS = 30

export const accessGenerationKey = (userId: string): string => `auth:access-gen:${userId}`

/**
 * One key per session and per generation of the user. Bumping the generation (role or status
 * change, sign-out of every session) makes every cached snapshot of that user unreachable at
 * once, without listing their sessions — which matters after `deleteMany` has removed the rows.
 */
export const accessSnapshotKey = (userId: string, sessionId: string | undefined, generation: string | null): string =>
  `auth:access:${userId}:${sessionId ?? '-'}:${generation ?? '0'}`

export function parseAccessSnapshot(raw: string | null): AccessSnapshot | null {
  if (!raw) return null

  try {
    const value = JSON.parse(raw) as Partial<AccessSnapshot>

    if (typeof value.role !== 'string' || typeof value.status !== 'string' || typeof value.email !== 'string') return null

    return { role: value.role, status: value.status, email: value.email }
  } catch {
    return null
  }
}
