import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { SecurityAuditListScreen } from '~/components/Views/SecurityAudit/Screen/SecurityAuditListScreen'

const AdminSecurityAuditPage = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'security-audit'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/', [UserRole.EDITOR]: '/' },
  })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <SecurityAuditListScreen />
    </div>
  )
}

export default AdminSecurityAuditPage
