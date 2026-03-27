import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { UserListScreen } from '~/components/Views/User/Screen'

const UsersDashboardPage = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'users'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/', [UserRole.EDITOR]: '/' },
  })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <UserListScreen />
    </div>
  )
}

export default UsersDashboardPage
