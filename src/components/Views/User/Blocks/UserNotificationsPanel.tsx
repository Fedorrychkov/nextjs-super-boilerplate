'use client'

import { NotificationsListScreen } from '~/components/Views/Notification/Screen/NotificationsListScreen'

type Props = {
  userId: string
}

export const UserNotificationsPanel = ({ userId }: Props) => {
  return <NotificationsListScreen mode="admin" forcedRecipientUserId={userId} titleKey="platformNotifications.adminTitle" />
}
