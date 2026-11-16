import { defaultGuard, PageProps } from '@lib/page'
import { adminOverview } from '@lib/services/admin-overview.service'
import { overviewAlerts } from '@lib/services/admin-overview-rules'

import { UserRole } from '~/api/user'
import { AdminOverviewScreen } from '~/components/Views/AdminOverview/AdminOverviewScreen'
import { routes } from '~/constants'

// The page reports the state right now: never cache it.
export const dynamic = 'force-dynamic'

const AdminOverviewPage = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN],
    // An editor has no infrastructure to look at; their admin starts at the articles.
    fallbackRolesNavigatePath: { [UserRole.USER]: '/', [UserRole.EDITOR]: routes.articles.path },
  })

  const overview = await adminOverview()

  return (
    <div className="w-full h-full flex flex-col flex-1 gap-6">
      <AdminOverviewScreen overview={overview} alerts={overviewAlerts(overview)} />
    </div>
  )
}

export default AdminOverviewPage
