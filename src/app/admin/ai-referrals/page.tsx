import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { AiReferralsDashboardScreen } from '~/components/Views/AiReferrals/AiReferralsDashboardScreen'

const AiReferralsDashboardPage = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'ai-referrals'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/', [UserRole.EDITOR]: '/' },
  })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <AiReferralsDashboardScreen />
    </div>
  )
}

export default AiReferralsDashboardPage
