import { notificationsQueue } from '@lib/queues/notifications.queue'
import { consume } from '@lib/queues/queue'
import { platformNotificationService } from '@lib/services/platform-notification.service'

/** Handler of the `notifications` queue: deliver a recorded notification. Wired in `scripts/worker.ts`. */
export const startNotificationsConsumer = (): Promise<void> =>
  consume(notificationsQueue, async ({ notificationId }) => {
    await platformNotificationService.deliver(notificationId)
  })
