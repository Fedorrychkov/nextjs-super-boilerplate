import connectDB from '@lib/db/client'
import SecurityAuditLog, { ISecurityAuditLog } from '@lib/db/models/SecurityAuditLog'

import type { SecurityAuditAction, SecurityAuditFilter, SecurityAuditItemModel } from '~/api/security-audit'
import type { PaginationMeta } from '~/types/pagination'

function mapAuditItem(doc: Pick<ISecurityAuditLog, '_id' | 'action' | 'actorUserId' | 'targetUserId' | 'metadata' | 'createdAt'>): SecurityAuditItemModel {
  return {
    id: doc._id.toString(),
    action: doc.action as SecurityAuditAction,
    actorUserId: doc.actorUserId?.toString() ?? null,
    targetUserId: doc.targetUserId.toString(),
    metadata: (doc.metadata as Record<string, string | null> | null | undefined) ?? null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  }
}

export async function recordSecurityAuditEvent(params: {
  action: SecurityAuditAction
  actorUserId?: string | null
  targetUserId: string
  metadata?: Record<string, string | null | undefined> | null
}): Promise<void> {
  await connectDB()

  await SecurityAuditLog.create({
    action: params.action,
    actorUserId: params.actorUserId ?? null,
    targetUserId: params.targetUserId,
    metadata: params.metadata ?? null,
  })
}

export async function listSecurityAuditEvents(filter: SecurityAuditFilter): Promise<PaginationMeta<SecurityAuditItemModel>> {
  await connectDB()

  const page = await SecurityAuditLog.findListPaginated(filter)

  return {
    ...page,
    list: page.list.map((doc) => mapAuditItem(doc)),
  }
}
