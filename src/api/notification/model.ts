/** Delivery channels (extensible list). */
export enum NotificationChannel {
  WEB_PUSH = 'web_push',
  EMAIL = 'email',
}

/** Aggregated and per-channel status (compatible with courier-web). */
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
  PASSWORD_CHANGED = 'password_changed',
  PASSWORD_RESET = 'password_reset',
  ADMIN_PASSWORD_SET = 'admin_password_set',
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
  /** Which channels were requested at creation time (web push, email, …). */
  channelsRequested: NotificationChannel[]
  /** Result per channel. */
  channelDeliveries: NotificationChannelDeliveryModel[]
  /** Summary status for lists and filters. */
  deliveryStatus: NotificationDeliveryStatus
  createdAt?: string | null
}
