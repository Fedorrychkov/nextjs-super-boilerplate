import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { NotificationsListScreen } from '~/components/Views/Notification/Screen/NotificationsListScreen'

const AdminNotificationsPage = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'notifications'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/', [UserRole.EDITOR]: '/' },
  })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <NotificationsListScreen mode="admin" titleKey="platformNotifications.adminTitle" />
    </div>
  )
}

export default AdminNotificationsPage
