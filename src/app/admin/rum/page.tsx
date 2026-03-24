import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { RumDashboardScreen } from '~/components/Views/Rum/RumDashboardScreen'

const RumDashboardPage = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'rum'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/', [UserRole.EDITOR]: '/' },
  })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <RumDashboardScreen />
    </div>
  )
}

export default RumDashboardPage
