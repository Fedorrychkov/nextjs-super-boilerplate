import { defaultGuard, PageProps } from '@lib/page'

import { UserRole } from '~/api/user'
import { MetricsScreen } from '~/components/Views/Metrics/MetricsScreen'

const AdminMetricsPage = async (props: PageProps) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'metrics'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/', [UserRole.EDITOR]: '/' },
  })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <MetricsScreen />
    </div>
  )
}

export default AdminMetricsPage
