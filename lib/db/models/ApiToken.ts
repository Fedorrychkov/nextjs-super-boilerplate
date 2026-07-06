import mongoose, { type Document, type HydratedDocument, type Model, type QueryFilter, Schema } from 'mongoose'

import type { ApiTokenFilter, ApiTokenKind } from '~/api/api-token'
import type { UserRole } from '~/api/user'
import type { PaginationMeta } from '~/types/pagination'

import { buildPaginationMeta, clampLimit } from '../utils/buildPaginationMeta'

export interface IApiToken extends Document {
  name: string
  /** sha256 hex of the raw token. The raw token is never stored. */
  tokenHash: string
  /** Display prefix, e.g. `nsb_pat_ab12cd34…`. */
  prefix: string
  ownerUserId: mongoose.Types.ObjectId
  /** Effective role for requests authorized by this token. Capped at the owner's role on issue. */
  role: UserRole
  /** `pat` — manually created; `oauth` — minted by the MCP OAuth layer (access token of a grant). */
  kind: ApiTokenKind
  /** Set for `kind: 'oauth'` — the McpOAuthGrant this access token belongs to (revocation cascades both ways). */
  grantId?: mongoose.Types.ObjectId | null
  scopes: string[]
  lastUsedAt?: Date | null
  expiresAt: Date
  revokedAt?: Date | null
  createdBy?: mongoose.Types.ObjectId | null
  createdAt: Date
}

export interface IApiTokenModel extends Model<IApiToken> {
  findListPaginated(filter: ApiTokenFilter): Promise<PaginationMeta<HydratedDocument<IApiToken>>>
}

const ApiTokenSchema: Schema<IApiToken> = new Schema<IApiToken>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    prefix: {
      type: String,
      required: true,
    },
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
    },
    // Default 'pat' keeps all pre-existing documents valid without a migration.
    kind: {
      type: String,
      enum: ['pat', 'oauth'],
      default: 'pat',
    },
    grantId: {
      type: Schema.Types.ObjectId,
      ref: 'McpOAuthGrant',
      default: null,
      index: true,
    },
    scopes: {
      type: [String],
      default: [],
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    // No TTL index on purpose: expired tokens stay visible in the admin list for audit.
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
)

;(ApiTokenSchema.statics as Record<string, unknown>).findListPaginated = async function findListPaginated(
  this: Model<IApiToken>,
  filter: ApiTokenFilter,
): Promise<PaginationMeta<HydratedDocument<IApiToken>>> {
  const { limit: limitRaw, offset: offsetRaw, status, ownerUserId } = filter

  const limit = clampLimit(typeof limitRaw === 'number' ? limitRaw : Number(limitRaw))
  const offset = typeof offsetRaw === 'number' ? Math.max(0, Math.floor(offsetRaw)) : Math.max(0, Number(offsetRaw) || 0)

  const now = new Date()
  const base: QueryFilter<IApiToken> = {}

  if (ownerUserId) {
    base.ownerUserId = new mongoose.Types.ObjectId(ownerUserId)
  }

  if (status === 'active') {
    base.revokedAt = null
    base.expiresAt = { $gt: now }
  } else if (status === 'revoked') {
    base.revokedAt = { $ne: null }
  } else if (status === 'expired') {
    base.revokedAt = null
    base.expiresAt = { $lte: now }
  }

  const count = await this.countDocuments(base)
  const list = await this.find(base).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit).exec()

  return buildPaginationMeta({
    list,
    count,
    limit: typeof limitRaw === 'number' ? limitRaw : Number(limitRaw),
    offset: typeof offsetRaw === 'number' ? offsetRaw : Number(offsetRaw),
  })
}

const ApiToken: IApiTokenModel =
  (mongoose.models.ApiToken as IApiTokenModel | undefined) || mongoose.model<IApiToken, IApiTokenModel>('ApiToken', ApiTokenSchema)

export default ApiToken
