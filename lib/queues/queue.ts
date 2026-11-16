import { createBullMqConnection } from '@lib/redis'

import { Logger } from '~/utils/logger'

/**
 * BullMQ queues: one definition — a producer in the API and a consumer in the worker.
 *
 * The definition (`defineQueue`) lives apart from its handler: the API enqueues and must not pull
 * in the delivery code, the worker attaches the handler with `consume`. That every defined queue
 * has a handler wired into `scripts/worker.ts` is checked by the `check-worker-wired` gate —
 * otherwise a job is "queued" and never runs.
 *
 * A job carries only the id of a database record, not the work itself: the database is the source
 * of truth. A lost job (Redis restarted, the worker died midway) leaves the record, and a sweep
 * picks it up.
 */

const logger = new Logger(['queues', '[lib/queues/queue.ts]'])

// As in worker-scheduler: `bullmq` is loaded lazily so its types stay out of the API bundle.
const BULLMQ_MODULE: string = 'bullmq'

export type QueueDefinition<T> = {
  name: string
  /** How many jobs the handler takes at once. */
  concurrency: number
  /** How many times to try a job before giving up. 1 — no retries. */
  attempts: number
  /** First pause before a retry; grows exponentially. */
  backoffMs: number
  /** Only carries the job data type; does not exist at runtime. */
  readonly __data?: T
}

export const defineQueue = <T>(definition: Omit<QueueDefinition<T>, '__data'>): QueueDefinition<T> => definition

export type EnqueueResult = 'queued' | 'unavailable'

type AnyQueue = { add: (name: string, data: unknown, options: unknown) => Promise<unknown>; close: () => Promise<void> }
type AnyWorker = { close: () => Promise<void>; on: (event: string, listener: (...args: any[]) => void) => void }

const producers = new Map<string, Promise<AnyQueue | null>>()
const consumers: AnyWorker[] = []

const producer = (definition: QueueDefinition<unknown>): Promise<AnyQueue | null> => {
  let pending = producers.get(definition.name)

  if (!pending) {
    pending = (async () => {
      const connection = createBullMqConnection()

      if (!connection) return null

      const { Queue } = (await import(BULLMQ_MODULE)) as any

      // worker-entry-ok: the shared constructor; that each queue has a handler is checked by the gate's "definition → consume" rule
      return new Queue(definition.name, {
        connection,
        defaultJobOptions: {
          attempts: definition.attempts,
          backoff: { type: 'exponential', delay: definition.backoffMs },
          // Redis is memory: completed jobs are kept an hour (for debugging), failed ones a week.
          removeOnComplete: { count: 1000, age: 3600 },
          removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
        },
      }) as AnyQueue
    })()

    // A failure is not remembered: one bad start would otherwise disable the queue in this process for good.
    pending.catch(() => producers.delete(definition.name))
    producers.set(definition.name, pending)
  }

  return pending
}

/**
 * Enqueue a job. `jobId` makes it idempotent: while a job with that id is alive, a second one is
 * not added — a sweep may re-enqueue a record any number of times.
 *
 * `unavailable` — Redis is not configured or not reachable. What to do is the caller's decision:
 * a notification, for one, is better delivered at once than lost.
 */
export const enqueue = async <T>(definition: QueueDefinition<T>, data: T, options: { jobId?: string; delayMs?: number } = {}): Promise<EnqueueResult> => {
  try {
    const queue = await producer(definition as QueueDefinition<unknown>)

    if (!queue) return 'unavailable'

    await queue.add(definition.name, data, { jobId: options.jobId, delay: options.delayMs })

    return 'queued'
  } catch (error) {
    logger.warn('enqueue', `queue ${definition.name} unavailable`, { message: error instanceof Error ? error.message : String(error) })

    return 'unavailable'
  }
}

export type JobContext = {
  /** Attempt number, from 1. */
  attempt: number
  /** Whether this is the last attempt: after it the job goes to failed. */
  lastAttempt: boolean
}

type FinalFailureListener = (queueName: string, error: unknown) => void

let onFinalFailure: FinalFailureListener | null = null

/** Where a job's final failure is reported besides the log (the metrics facade registers itself). */
export const setFinalFailureListener = (listener: FinalFailureListener | null): void => {
  onFinalFailure = listener
}

/** Attach a queue handler. Worker only. An error from the handler is a retry with a pause until attempts run out. */
export const consume = async <T>(definition: QueueDefinition<T>, handler: (data: T, context: JobContext) => Promise<unknown>): Promise<void> => {
  const connection = createBullMqConnection()

  if (!connection) {
    logger.warn('consume', `REDIS_URL not set — queue ${definition.name} is not processed`)

    return
  }

  const { Worker } = (await import(BULLMQ_MODULE)) as any

  // worker-entry-ok: the shared constructor; each queue's wiring is checked by the gate's "definition → consume" rule
  const worker: AnyWorker = new Worker(
    definition.name,
    async (job: { data: T; attemptsMade: number; opts: { attempts?: number } }) => {
      const attempt = job.attemptsMade + 1

      return handler(job.data, { attempt, lastAttempt: attempt >= (job.opts.attempts ?? 1) })
    },
    { connection, concurrency: definition.concurrency },
  )

  worker.on('failed', (job: { id?: string; attemptsMade?: number; opts?: { attempts?: number } } | undefined, error: unknown) => {
    logger.error('job-failed', { queue: definition.name, jobId: job?.id, error })

    if ((job?.attemptsMade ?? 0) >= (job?.opts?.attempts ?? 1)) onFinalFailure?.(definition.name, error)
  })

  consumers.push(worker)
  logger.info('consume', `queue ${definition.name}: handler attached, concurrency ${definition.concurrency}`)
}

/** Stop handlers and producers: the worker on SIGTERM, tests. */
export const closeQueues = async (): Promise<void> => {
  await Promise.all(consumers.splice(0).map((worker) => worker.close()))

  const queues = await Promise.allSettled([...producers.values()])

  producers.clear()
  await Promise.all(queues.map((result) => (result.status === 'fulfilled' ? result.value?.close() : undefined)))
}
