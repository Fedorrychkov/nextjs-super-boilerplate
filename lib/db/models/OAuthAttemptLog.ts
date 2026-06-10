import mongoose, { type Document, type HydratedDocument, type Model, type QueryFilter, Schema } from 'mongoose'

import type { OAuthAttemptOutcome, OAuthFlow, OAuthProviderId } from '~/api/oauth'
import type { OAuthAttemptFilter, OAuthAttemptItemModel } from '~/api/oauth/types'
import type { PaginationMeta } from '~/types/pagination'

import { applyCreatedAtRange } from '../utils/applyCreatedAtRange'
import { buildPaginationMeta, clampLimit } from '../utils/buildPaginationMeta'

const OAUTH_FLOWS: OAuthFlow[] = ['signIn', 'signUp', 'link']
const OAUTH_OUTCOMES: OAuthAttemptOutcome[] = ['success', 'email_collision', 'provider_taken', 'not_found', 'error']

export interface IOAuthAttemptLog extends Document, Omit<OAuthAttemptItemModel, 'id' | 'collisionUserId' | 'actorUserId' | 'createdAt'> {
  collisionUserId?: mongoose.Types.ObjectId | null
  actorUserId?: mongoose.Types.ObjectId | null
  createdAt: Date
}

export interface IOAuthAttemptLogModel extends Model<IOAuthAttemptLog> {
  findListPaginated(filter: OAuthAttemptFilter): Promise<PaginationMeta<HydratedDocument<IOAuthAttemptLog>>>
}

function applyOAuthAttemptFilterFields(q: QueryFilter<IOAuthAttemptLog>, filter: OAuthAttemptFilter) {
  if (filter.userId != null && mongoose.Types.ObjectId.isValid(String(filter.userId))) {
    const oid = new mongoose.Types.ObjectId(String(filter.userId))
    q.$or = [{ collisionUserId: oid }, { actorUserId: oid }]
  } else {
    if (filter.collisionUserId != null && mongoose.Types.ObjectId.isValid(String(filter.collisionUserId))) {
      q.collisionUserId = new mongoose.Types.ObjectId(String(filter.collisionUserId))
    }

    if (filter.actorUserId != null && mongoose.Types.ObjectId.isValid(String(filter.actorUserId))) {
      q.actorUserId = new mongoose.Types.ObjectId(String(filter.actorUserId))
    }
  }

  if (filter.provider != null && String(filter.provider).trim()) {
    q.provider = String(filter.provider).trim().toLowerCase() as OAuthProviderId
  }

  if (filter.flow != null && String(filter.flow).trim()) {
    const flow = String(filter.flow).trim()

    if ((OAUTH_FLOWS as string[]).includes(flow)) {
      q.flow = flow as OAuthFlow
    }
  }

  if (filter.outcome != null && String(filter.outcome).trim()) {
    const outcome = String(filter.outcome).trim()

    if ((OAUTH_OUTCOMES as string[]).includes(outcome)) {
      q.outcome = outcome as OAuthAttemptOutcome
    }
  }

  if (filter.providerEmail != null && String(filter.providerEmail).trim()) {
    q.providerEmail = String(filter.providerEmail).trim().toLowerCase()
  }
}

const OAuthAttemptLogSchema = new Schema<IOAuthAttemptLog>(
  {
    provider: { type: String, required: true, index: true },
    providerUserId: { type: String, required: true },
    providerEmail: { type: String, default: null, lowercase: true, trim: true },
    flow: { type: String, required: true, enum: OAUTH_FLOWS },
    outcome: {
      type: String,
      required: true,
      enum: OAUTH_OUTCOMES,
      index: true,
    },
    collisionUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    createdAt: { type: Date, default: () => new Date(), index: true },
  },
  { timestamps: false },
)

;(OAuthAttemptLogSchema.statics as Record<string, unknown>).findListPaginated = async function findListPaginated(
  this: Model<IOAuthAttemptLog>,
  filter: OAuthAttemptFilter,
): Promise<PaginationMeta<HydratedDocument<IOAuthAttemptLog>>> {
  const { limit: limitRaw, offset: offsetRaw, startOfDateIso, endOfDateIso, ...rest } = filter

  const limit = clampLimit(typeof limitRaw === 'number' ? limitRaw : Number(limitRaw))
  const offset = typeof offsetRaw === 'number' ? Math.max(0, Math.floor(offsetRaw)) : Math.max(0, Number(offsetRaw) || 0)

  const base: QueryFilter<IOAuthAttemptLog> = {}
  applyOAuthAttemptFilterFields(base, rest)
  applyCreatedAtRange<IOAuthAttemptLog>(base, startOfDateIso, endOfDateIso)

  const count = await this.countDocuments(base)
  const list = await this.find(base).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit).exec()

  return buildPaginationMeta({
    list,
    count,
    limit: typeof limitRaw === 'number' ? limitRaw : Number(limitRaw),
    offset: typeof offsetRaw === 'number' ? offsetRaw : Number(offsetRaw),
  })
}

const OAuthAttemptLog: IOAuthAttemptLogModel =
  (mongoose.models.OAuthAttemptLog as IOAuthAttemptLogModel | undefined) ||
  mongoose.model<IOAuthAttemptLog, IOAuthAttemptLogModel>('OAuthAttemptLog', OAuthAttemptLogSchema)

export default OAuthAttemptLog
