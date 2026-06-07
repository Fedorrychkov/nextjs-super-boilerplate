'use client'

import { SecurityAuditListScreen } from '~/components/Views/SecurityAudit/Screen/SecurityAuditListScreen'

type Props = {
  userId: string
}

export const AdminUserSecurityAuditPanel = ({ userId }: Props) => {
  return <SecurityAuditListScreen forcedTargetUserId={userId} titleKey="securityAudit.userTitle" />
}
