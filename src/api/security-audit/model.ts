export type SecurityAuditAction =
  | 'password_changed'
  | 'password_reset'
  | 'admin_password_set'
  | 'admin_mfa_reset'
  | 'api_token_created'
  | 'api_token_revoked'
  | 'api_token_request'
  | 'api_token_denied'
  | 'api_token_policy_updated'
  | 'mcp_oauth_client_registered'
  | 'mcp_oauth_consent_granted'
  | 'mcp_oauth_consent_denied'
  | 'mcp_oauth_tokens_issued'
  | 'mcp_oauth_grant_revoked'
  | 'machine_access_blocked'
  | 'machine_access_unblocked'

export type SecurityAuditItemModel = {
  id: string
  action: SecurityAuditAction
  actorUserId: string | null
  targetUserId: string
  metadata?: Record<string, string | null> | null
  createdAt?: string | null
}
