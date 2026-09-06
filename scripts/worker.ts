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
 *  - individual jobs: env flags via `isOn` (e.g. WORKER_HEARTBEAT=false)
 *
 * Start: `npm run worker:<env>` (uses env-cmd + `node --import tsx`).
 */
import connectDB from '@lib/db/client'
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
]

const main = async (): Promise<void> => {
  await connectDB()

  await startWorkerScheduler(jobs)

  logger.info('ready', 'background worker started')
}

const shutdown = async (signal: string): Promise<void> => {
  logger.info('shutdown', `received ${signal}`)

  try {
    await stopWorkerScheduler()
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
