import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { LlmUsageDashboardScreen } from '~/components/Views/LlmUsage/LlmUsageDashboardScreen'

const LlmUsageDashboardPage = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'llm-usage'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/', [UserRole.EDITOR]: '/' },
  })

  return (
    <div className="flex h-full w-full flex-1 flex-col justify-center gap-6">
      <LlmUsageDashboardScreen />
    </div>
  )
}

export default LlmUsageDashboardPage
