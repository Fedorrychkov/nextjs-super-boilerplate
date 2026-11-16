import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { PlatformSettingsScreen } from '~/components/Views/PlatformSettings/PlatformSettingsScreen'

const AdminPlatformSettingsPage = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'platform-settings'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/', [UserRole.EDITOR]: '/' },
  })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <PlatformSettingsScreen />
    </div>
  )
}

export default AdminPlatformSettingsPage
