import mongoose, { type Document, type HydratedDocument, type Model, type QueryFilter, Schema } from 'mongoose'

import type { SecurityAuditFilter, SecurityAuditItemModel } from '~/api/security-audit'
import type { PaginationMeta } from '~/types/pagination'

import { applyCreatedAtRange } from '../utils/applyCreatedAtRange'
import { buildPaginationMeta, clampLimit } from '../utils/buildPaginationMeta'

export interface ISecurityAuditLog extends Document, Omit<SecurityAuditItemModel, 'id' | 'actorUserId' | 'targetUserId'> {
  actorUserId: mongoose.Types.ObjectId | null
  targetUserId: mongoose.Types.ObjectId
}

export interface ISecurityAuditLogModel extends Model<ISecurityAuditLog> {
  findListPaginated(filter: SecurityAuditFilter): Promise<PaginationMeta<HydratedDocument<ISecurityAuditLog>>>
}

function applySecurityAuditFilterFields(q: QueryFilter<ISecurityAuditLog>, filter: SecurityAuditFilter) {
  if (filter.targetUserId != null && mongoose.Types.ObjectId.isValid(String(filter.targetUserId))) {
    q.targetUserId = new mongoose.Types.ObjectId(String(filter.targetUserId))
  }

  if (filter.actorUserId != null && mongoose.Types.ObjectId.isValid(String(filter.actorUserId))) {
    q.actorUserId = new mongoose.Types.ObjectId(String(filter.actorUserId))
  }

  if (filter.action != null && String(filter.action).trim()) {
    q.action = String(filter.action).trim()
  }
}

const SecurityAuditLogSchema: Schema<ISecurityAuditLog> = new Schema<ISecurityAuditLog>(
  {
    action: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    actorUserId: {
      type: Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
)

;(SecurityAuditLogSchema.statics as Record<string, unknown>).findListPaginated = async function findListPaginated(
  this: Model<ISecurityAuditLog>,
  filter: SecurityAuditFilter,
): Promise<PaginationMeta<HydratedDocument<ISecurityAuditLog>>> {
  const { limit: limitRaw, offset: offsetRaw, startOfDateIso, endOfDateIso, ...rest } = filter

  const limit = clampLimit(typeof limitRaw === 'number' ? limitRaw : Number(limitRaw))
  const offset = typeof offsetRaw === 'number' ? Math.max(0, Math.floor(offsetRaw)) : Math.max(0, Number(offsetRaw) || 0)

  const base: QueryFilter<ISecurityAuditLog> = {}
  applySecurityAuditFilterFields(base, rest)
  applyCreatedAtRange<ISecurityAuditLog>(base, startOfDateIso, endOfDateIso)

  const count = await this.countDocuments(base)
  const list = await this.find(base).sort({ createdAt: -1, _id: -1 }).skip(offset).limit(limit).exec()

  return buildPaginationMeta({
    list,
    count,
    limit: typeof limitRaw === 'number' ? limitRaw : Number(limitRaw),
    offset: typeof offsetRaw === 'number' ? offsetRaw : Number(offsetRaw),
  })
}

const SecurityAuditLog: ISecurityAuditLogModel =
  (mongoose.models.SecurityAuditLog as ISecurityAuditLogModel | undefined) ||
  mongoose.model<ISecurityAuditLog, ISecurityAuditLogModel>('SecurityAuditLog', SecurityAuditLogSchema)

export default SecurityAuditLog
