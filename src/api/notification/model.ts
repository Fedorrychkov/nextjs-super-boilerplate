/** Каналы доставки (расширяемый список). */
export enum NotificationChannel {
  WEB_PUSH = 'web_push',
  EMAIL = 'email',
}

/** Агрегированный и per-channel статус (совместим с courier-web). */
export enum NotificationDeliveryStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  SKIPPED_NO_TARGET = 'skipped_no_subscription',
  SKIPPED = 'skipped',
  RECORD_ONLY = 'record_only',
}

export enum PlatformNotificationType {
  SYSTEM = 'system',
  TEST = 'test',
  ARTICLE_PUBLISHED = 'article_published',
  ARTICLE_UPDATED = 'article_updated',
  USER_MESSAGE = 'user_message',
  MFA_ENABLED = 'mfa_enabled',
  MFA_DISABLED = 'mfa_disabled',
  NEW_LOGIN = 'new_login',
}

export type NotificationChannelDeliveryModel = {
  channel: NotificationChannel
  status: NotificationDeliveryStatus
  attempted: boolean
  deliveredCount?: number | null
  error?: string | null
}

export type PlatformNotificationModel = {
  id: string
  recipientUserId: string | null
  type: string
  title: string
  body: string
  urlPath: string
  source: string | null
  /** Какие каналы запрашивали при создании (web push, email, …). */
  channelsRequested: NotificationChannel[]
  /** Результат по каждому каналу. */
  channelDeliveries: NotificationChannelDeliveryModel[]
  /** Сводный статус для списков и фильтров. */
  deliveryStatus: NotificationDeliveryStatus
  createdAt?: string | null
}
