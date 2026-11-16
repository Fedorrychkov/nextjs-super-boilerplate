import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { UserAdminProfileScreen } from '~/components/Views/User/Screen'

const UserAdminProfilePage = async (props: PageProps<{ id: string }>) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'users', '[id]'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/', [UserRole.EDITOR]: '/' },
  })
  const { id } = await props.params

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <UserAdminProfileScreen userId={id} />
    </div>
  )
}

export default UserAdminProfilePage
