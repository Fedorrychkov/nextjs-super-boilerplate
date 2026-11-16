/**
 * Background worker entrypoint (headless — no HTTP server).
 *
 * Runs periodic maintenance jobs (BullMQ) in a process separate from the web
 * instances, so background work doesn't compete for resources/restarts with the
 * API and can be scaled/restarted independently. Run exactly ONE instance.
 * See docs/deploy/background-worker.ru.md for the architecture and pitfalls.
 *
 * Project jobs go into the `jobs` registry below. Each `run` must be idempotent;
 * keep the schedule source of truth in the DB (`nextRunAt`-style fields) so the
 * runner (BullMQ / HTTP cron / one-shot CLI) stays swappable.
 *
 * Enable per environment:
 *  - compose/CI: WORKER_ENABLED=true (deploy workflow input `worker_enabled`)
 *  - individual jobs: env flags via `isOn` (e.g. WORKER_HEARTBEAT=false); the liveness mark (`worker-beat`) is always on
 *
 * Start: `npm run worker:<env>` (uses env-cmd + `node --import tsx`).
 */
import connectDB from '@lib/db/client'
import { metrics } from '@lib/metrics'
import { startNotificationsConsumer } from '@lib/queues/notifications.consumer'
import { closeQueues, setFinalFailureListener } from '@lib/queues/queue'
import { articleScheduleService } from '@lib/services/article-schedule.service'
import { platformNotificationService } from '@lib/services/platform-notification.service'
import { WORKER_BEAT_INTERVAL_MS } from '@lib/services/worker-health'
import { beat } from '@lib/services/worker-health.service'
import { startWorkerScheduler, stopWorkerScheduler, WorkerJob } from '@lib/services/worker-scheduler'

import { Logger } from '~/utils/logger'

const logger = new Logger(['worker', '[scripts/worker.ts]'])

const isOn = (value: string | undefined, defaultOn: boolean): boolean => {
  const v = String(value ?? (defaultOn ? 'true' : 'false')).toLowerCase()

  return v !== 'false' && v !== '0' && v !== 'off'
}

const jobs: WorkerJob[] = [
  /**
   * Example job — replace/extend with project jobs (expiry sweeps, digests,
   * collectors, notification queues...). Kept as a cheap liveness signal:
   * one log line per interval proves the scheduler + Redis are healthy.
   */
  {
    name: 'heartbeat',
    intervalMs: Number(process.env.WORKER_HEARTBEAT_INTERVAL_MS ?? 5 * 60 * 1000),
    enabled: isOn(process.env.WORKER_HEARTBEAT, false),
    run: async () => {
      logger.info('heartbeat', 'alive')

      return { ok: true }
    },
  },
  /**
   * "The worker is alive" mark in the database, read by the healthcheck and by producers deciding
   * whether to enqueue. A successful mark proves the scheduler, Redis and the database at once.
   */
  {
    name: 'worker-beat',
    intervalMs: WORKER_BEAT_INTERVAL_MS,
    run: async () => beat(),
  },
  /** Notifications stuck pending (lost job, crashed attempt) go back to the queue. */
  {
    name: 'notifications-requeue',
    intervalMs: 2 * 60 * 1000,
    run: async () => ({ requeued: await platformNotificationService.requeueStuck() }),
  },
  /** Retention: per-channel delivery logs older than 90 days are dropped; notifications stay. */
  {
    name: 'data-retention',
    intervalMs: 60 * 60 * 1000,
    run: async () => ({ deliveryHistories: await platformNotificationService.sweepDeliveryHistory() }),
  },
  /** Scheduled publishing: articles set to go live at a time are published here, once a minute. */
  {
    name: 'articles-scheduled',
    intervalMs: 60 * 1000,
    run: async () => articleScheduleService.publishDue(),
  },
]

const main = async (): Promise<void> => {
  await connectDB()

  // A job that failed for good is an error worth tracking, like a 500 from the API.
  setFinalFailureListener((queue, error) => metrics.error(error, { route: `/queue/${queue}` }))

  await startWorkerScheduler(jobs)
  // Queue handlers: every queue defined with defineQueue must be consumed here (check-worker-wired).
  await startNotificationsConsumer()

  logger.info('ready', 'background worker started')
}

const shutdown = async (signal: string): Promise<void> => {
  logger.info('shutdown', `received ${signal}`)

  try {
    await stopWorkerScheduler()
    await closeQueues()
  } finally {
    process.exit(0)
  }
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

main().catch((error) => {
  logger.error('fatal', error)
  process.exit(1)
})
