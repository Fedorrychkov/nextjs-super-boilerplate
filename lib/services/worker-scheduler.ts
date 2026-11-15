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
 * live in the DB (e.g. a `nextRunAt` field) — see docs/deploy/background-worker.ru.md.
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
 * Start the maintenance scheduler as BullMQ Job Schedulers (worker process only).
 * Idempotent. Falls back to a no-op (with a warning) when Redis is not configured.
 *
 * Portable cron architecture (see docs/deploy/background-worker.ru.md):
 *  - `removeOnComplete/removeOnFail` so Redis does not grow forever
 *  - one scheduler per job name: `upsertJobScheduler` replaces the interval in place, and
 *    schedulers of removed jobs are dropped on boot
 *  - `concurrency: 1` — exactly one job at a time
 *  - dedicated Redis connections with `maxRetriesPerRequest: null`
 *
 * Job Schedulers, not repeatable jobs: `getRepeatableJobs` / `repeat` are deprecated in BullMQ 5
 * and removed in 6, and a repeatable job was keyed by (name + every), so an interval change left
 * the old one ticking.
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

  // Schedules written by the previous version of this file (`queue.add(..., { repeat })`) live in
  // Redis of every deployment that ran it; left alone they would tick next to the schedulers below.
  // Removed while BullMQ still has the API (5.x); on 6 there is nothing left to remove.
  if (typeof queue.getRepeatableJobs === 'function') {
    for (const repeatable of (await queue.getRepeatableJobs()) as { key: string }[]) {
      await queue.removeRepeatableByKey(repeatable.key)
    }
  }

  // A scheduler is keyed by the job name: upsert changes the interval in place. Schedulers of
  // renamed or removed jobs would keep ticking into the "unknown job" branch — drop them.
  const schedulers: { key: string }[] = await queue.getJobSchedulers()

  for (const scheduler of schedulers) {
    if (!activeJobs.some(({ name }) => name === scheduler.key)) {
      await queue.removeJobScheduler(scheduler.key)
    }
  }

  for (const job of activeJobs) {
    await queue.upsertJobScheduler(job.name, { every: job.intervalMs }, { name: job.name, data: {} })
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
