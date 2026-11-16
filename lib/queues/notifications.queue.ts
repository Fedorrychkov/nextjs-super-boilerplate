import { defineQueue } from './queue'

/**
 * Delivery of a notification over its channels. The job holds only the `PlatformNotification` id:
 * what to send and to whom is in the database, so a sweep can re-enqueue it knowing nothing else.
 *
 * Concurrency 8: channels wait on the network (push services, mail), not the CPU. Only a failure
 * of delivery itself (database, code) retries the job; a channel refusing is written to the log
 * and not retried — as it was while delivery ran inside the request.
 */
export const notificationsQueue = defineQueue<{ notificationId: string }>({
  name: 'notifications',
  concurrency: 8,
  attempts: 5,
  backoffMs: 5_000,
})
