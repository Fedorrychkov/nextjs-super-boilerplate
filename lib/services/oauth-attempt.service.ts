import connectDB from '@lib/db/client'
import OAuthAttemptLog, { type IOAuthAttemptLog } from '@lib/db/models/OAuthAttemptLog'

import type { OAuthAttemptFilter, OAuthAttemptItemModel } from '~/api/oauth/types'
import type { PaginationMeta } from '~/types/pagination'

function mapAttemptItem(
  doc: Pick<
    IOAuthAttemptLog,
    '_id' | 'provider' | 'providerUserId' | 'providerEmail' | 'flow' | 'outcome' | 'collisionUserId' | 'actorUserId' | 'ip' | 'userAgent' | 'createdAt'
  >,
): OAuthAttemptItemModel {
  return {
    id: doc._id.toString(),
    provider: doc.provider,
    providerUserId: doc.providerUserId,
    providerEmail: doc.providerEmail ?? null,
    flow: doc.flow,
    outcome: doc.outcome,
    collisionUserId: doc.collisionUserId?.toString() ?? null,
    actorUserId: doc.actorUserId?.toString() ?? null,
    ip: doc.ip ?? null,
    userAgent: doc.userAgent ?? null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  }
}

export async function listOAuthAttempts(filter: OAuthAttemptFilter): Promise<PaginationMeta<OAuthAttemptItemModel>> {
  await connectDB()

  const page = await OAuthAttemptLog.findListPaginated(filter)

  return {
    ...page,
    list: page.list.map((doc) => mapAttemptItem(doc)),
  }
}
