import type { SecurityAuditAction } from './model'

export type SecurityAuditFilter = {
  targetUserId?: string
  actorUserId?: string
  action?: SecurityAuditAction | string
  limit?: number
  offset?: number
  startOfDateIso?: string
  endOfDateIso?: string
}
