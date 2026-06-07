export type SecurityAuditAction = 'password_changed' | 'password_reset' | 'admin_password_set' | 'admin_mfa_reset'

export type SecurityAuditItemModel = {
  id: string
  action: SecurityAuditAction
  actorUserId: string | null
  targetUserId: string
  metadata?: Record<string, string | null> | null
  createdAt?: string | null
}
