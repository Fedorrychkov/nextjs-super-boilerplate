import connectDB from '@lib/db/client'
import OAuthAttemptLog from '@lib/db/models/OAuthAttemptLog'
import User from '@lib/db/models/User'

import type { OAuthAttemptOutcome, OAuthFlow, OAuthProviderId } from '~/api/oauth'

type LogParams = {
  provider: OAuthProviderId
  providerUserId: string
  providerEmail?: string | null
  flow: OAuthFlow
  outcome: OAuthAttemptOutcome
  collisionUserId?: string | null
  actorUserId?: string | null
  ip?: string | null
  userAgent?: string | null
}

export async function logOAuthAttempt(params: LogParams): Promise<void> {
  await connectDB()

  await OAuthAttemptLog.create({
    provider: params.provider,
    providerUserId: params.providerUserId,
    providerEmail: params.providerEmail ?? null,
    flow: params.flow,
    outcome: params.outcome,
    collisionUserId: params.collisionUserId ?? null,
    actorUserId: params.actorUserId ?? null,
    ip: params.ip ?? null,
    userAgent: params.userAgent ?? null,
  })
}

export async function findUserByEmailForCollision(email: string | null | undefined) {
  if (!email?.trim()) {
    return null
  }

  await connectDB()

  return User.findOne({ email: email.trim().toLowerCase() })
}

export function buildInternalOAuthEmail(provider: OAuthProviderId, providerUserId: string): string {
  return `${provider}_${providerUserId}@oauth.local`
}
