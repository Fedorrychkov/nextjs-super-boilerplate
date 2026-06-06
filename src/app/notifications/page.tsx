import { defaultGuard, PageProps } from '@lib/page'

import { NotificationsListScreen } from '~/components/Views/Notification/Screen/NotificationsListScreen'

const NotificationsPage = async (props: PageProps) => {
  await defaultGuard({ ...props, segments: ['notifications'], fallbackNavigatePath: '/login' })

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1 gap-6">
      <NotificationsListScreen mode="mine" />
    </div>
  )
}

export default NotificationsPage
