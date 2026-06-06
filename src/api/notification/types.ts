import type { NotificationChannel, PlatformNotificationModel } from './model'

export type PlatformNotificationFilter = {
  recipientUserId?: string | null
  deliveryStatus?: string | null
  type?: string | null
  startOfDateIso?: string | null
  endOfDateIso?: string | null
  limit?: number | string | null
  offset?: number | string | null
}

export type PlatformNotificationListResponse = {
  list: PlatformNotificationModel[]
  count: number
  currentPage: number
  pages: number
}

export type CreatePlatformNotificationDto = {
  recipientUserId: string | null
  type: string
  title: string
  body: string
  urlPath: string
  source?: string | null
  channels?: NotificationChannel[]
}
