import type { OAuthAttemptOutcome, OAuthFlow, OAuthProviderId } from './model'

export type OAuthAttemptItemModel = {
  id: string
  provider: OAuthProviderId
  providerUserId: string
  providerEmail?: string | null
  flow: OAuthFlow
  outcome: OAuthAttemptOutcome
  collisionUserId?: string | null
  actorUserId?: string | null
  ip?: string | null
  userAgent?: string | null
  createdAt?: string | null
}

export type OAuthAttemptFilter = {
  provider?: OAuthProviderId | string
  flow?: OAuthFlow | string
  outcome?: OAuthAttemptOutcome | string
  collisionUserId?: string
  actorUserId?: string
  /** Matches collisionUserId OR actorUserId */
  userId?: string
  providerEmail?: string
  limit?: number
  offset?: number
  startOfDateIso?: string
  endOfDateIso?: string
}
