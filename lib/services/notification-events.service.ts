import { type NotificationEventId, resolveNotificationChannelsForEvent } from '@config/notification-events'
import { platformNotificationService } from '@lib/services/platform-notification.service'

import { type NotificationChannel, PlatformNotificationType } from '~/api/notification'
import type { TFunction } from '~/lib/i18n'
import { Logger } from '~/utils/logger'

const logger = new Logger(['NotificationEventsService', '[lib/services/notification-events.service.ts]'])

type DeliverEventNotificationParams = {
  eventId: NotificationEventId
  recipientUserId: string
  type: PlatformNotificationType | string
  title: string
  body: string
  urlPath: string
  source: string
  channels?: NotificationChannel[]
  t: TFunction
}

export async function deliverEventNotification(params: DeliverEventNotificationParams): Promise<void> {
  const channels = params.channels ?? resolveNotificationChannelsForEvent(params.eventId)

  if (!channels?.length) {
    return
  }

  try {
    await platformNotificationService.createAndDeliver(
      {
        recipientUserId: params.recipientUserId,
        type: params.type,
        title: params.title,
        body: params.body,
        urlPath: params.urlPath,
        source: params.source,
        channels,
      },
      params.t,
    )
  } catch (error) {
    logger.error('Failed to deliver event notification', {
      error,
      eventId: params.eventId,
      recipientUserId: params.recipientUserId,
      type: params.type,
    })
  }
}
