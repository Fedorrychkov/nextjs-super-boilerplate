import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { OAuthAttemptsListScreen } from '~/components/Views/OAuthAttempts/Screen/OAuthAttemptsListScreen'

const AdminOAuthAttemptsPage = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'oauth-attempts'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/', [UserRole.EDITOR]: '/' },
  })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <OAuthAttemptsListScreen />
    </div>
  )
}

export default AdminOAuthAttemptsPage
