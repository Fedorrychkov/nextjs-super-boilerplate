import { createBullMqConnection } from '@lib/redis'

import { Logger } from '~/utils/logger'

const logger = new Logger(['worker-scheduler', '[lib/services/worker-scheduler.ts]'])

const QUEUE_NAME = 'app-maintenance'

// `bullmq` is a worker-only runtime dep. Widening the specifier to `string` keeps
// the type-checker from resolving the module in the API bundle; it is loaded
// lazily only when the scheduler actually starts (worker process).
const BULLMQ_MODULE: string = 'bullmq'

/**
 * A periodic background job. Register in `scripts/worker.ts`.
 * `run` must be IDEMPOTENT and safe to re-run: the schedule source of truth should
 * live in the DB (e.g. a `nextRunAt` field) — see docs/CRON_ARCHITECTURE_PORTABLE_RU.md.
 */
export type WorkerJob = {
  /** Unique job name (also the BullMQ jobId). */
  name: string
  /** Tick interval in ms. */
  intervalMs: number
  /** Set `false` to skip registration (e.g. env-flag gating). @default true */
  enabled?: boolean
  run: () => Promise<unknown>
}

let queue: any = null

let worker: any = null

/**
 * Start the maintenance scheduler as BullMQ repeatable jobs (worker process only).
 * Idempotent. Falls back to a no-op (with a warning) when Redis is not configured.
 *
 * Portable cron architecture (see docs/CRON_ARCHITECTURE_PORTABLE_RU.md):
 *  - `removeOnComplete/removeOnFail` so Redis does not grow forever
 *  - stale repeatable-job cleanup on boot so an interval change does not double-tick
 *  - `concurrency: 1` — exactly one job at a time
 *  - dedicated Redis connections with `maxRetriesPerRequest: null`
 */
export const startWorkerScheduler = async (jobs: WorkerJob[]): Promise<void> => {
  if (queue) {
    return
  }

  const activeJobs = jobs.filter((job) => job.enabled !== false)

  if (!activeJobs.length) {
    logger.warn('start', 'no jobs registered — scheduler disabled')

    return
  }

  const connection = createBullMqConnection()

  if (!connection) {
    logger.warn('start', 'REDIS_URL not set — worker scheduler disabled')

    return
  }

  const { Queue, Worker } = (await import(BULLMQ_MODULE)) as any

  queue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: { count: 100, age: 3600 },
      removeOnFail: { count: 500, age: 24 * 3600 },
    },
  })

  // Drop stale repeatable schedules (renamed/removed jobs or a changed interval)
  // before re-adding — a repeatable job is keyed by (name + every), so an interval
  // change would otherwise leave the old schedule ticking alongside the new one.
  const repeatables = await queue.getRepeatableJobs()

  for (const repeatable of repeatables) {
    const job = activeJobs.find(({ name }) => name === repeatable.name)

    if (!job || job.intervalMs !== repeatable.every) {
      await queue.removeRepeatableByKey(repeatable.key)
    }
  }

  for (const job of activeJobs) {
    await queue.add(job.name, {}, { repeat: { every: job.intervalMs }, jobId: job.name })
  }

  worker = new Worker(
    QUEUE_NAME,
    async (bullJob: { name: string }) => {
      const job = activeJobs.find(({ name }) => name === bullJob.name)

      if (!job) {
        logger.warn('tick', `unknown job "${bullJob.name}" — skipped`)

        return null
      }

      return job.run()
    },
    { connection: createBullMqConnection(), concurrency: 1 },
  )

  worker.on('failed', (_job: unknown, error: unknown) => logger.error('job-failed', error))

  logger.info('start', `worker scheduler started: ${activeJobs.map(({ name, intervalMs }) => `${name} every ${Math.round(intervalMs / 1000)}s`).join(', ')}`)
}

export const stopWorkerScheduler = async (): Promise<void> => {
  await worker?.close()
  await queue?.close()
  worker = null
  queue = null
}
