/**
 * Every audit action, once. The type is derived from it, so the filter list (lib/db/models/
 * SecurityAuditLog.ts) cannot drift from the union again: it used to miss seven actions the code
 * emits, and filtering by them silently returned everything.
 */
export const SECURITY_AUDIT_ACTIONS = [
  'password_changed',
  'password_reset',
  'admin_password_set',
  'admin_mfa_reset',
  'api_token_created',
  'api_token_revoked',
  'api_token_request',
  'api_token_denied',
  'api_token_policy_updated',
  'mcp_oauth_client_registered',
  'mcp_oauth_consent_granted',
  'mcp_oauth_consent_denied',
  'mcp_oauth_tokens_issued',
  'mcp_oauth_grant_revoked',
  'machine_access_blocked',
  'machine_access_unblocked',
] as const

export type SecurityAuditAction = (typeof SECURITY_AUDIT_ACTIONS)[number]

export type SecurityAuditItemModel = {
  id: string
  action: SecurityAuditAction
  actorUserId: string | null
  targetUserId: string
  metadata?: Record<string, string | null> | null
  createdAt?: string | null
}
