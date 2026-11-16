import { hostname } from 'node:os'

import connectDB from '@lib/db/client'
import WorkerHeartbeat from '@lib/db/models/WorkerHeartbeat'
import { type WorkerState, workerState } from '@lib/services/worker-health'

/** There is one worker (scripts/worker.ts), so one mark. */
const WORKER_ID = 'worker'

const startedAt = new Date()

/** Called by the worker on a schedule: a successful mark proves the scheduler, Redis and the database alike. */
export async function beat(now: Date = new Date()): Promise<void> {
  await connectDB()
  await WorkerHeartbeat.updateOne({ _id: WORKER_ID }, { $set: { beatAt: now, startedAt, host: hostname(), pid: process.pid } }, { upsert: true })
}

export async function workerStatus(now: Date = new Date()): Promise<WorkerState> {
  await connectDB()

  const heartbeat = await WorkerHeartbeat.findById(WORKER_ID).select('beatAt').lean()

  return workerState(heartbeat?.beatAt ?? null, now)
}

const ALIVE_CACHE_MS = 30_000
let aliveCache: { at: number; alive: boolean } | null = null

/**
 * Whether queued work will actually be picked up. Producers ask this before enqueueing: a
 * deployment with Redis but the worker switched off (the default) must keep doing the work inline,
 * not park it in a queue nobody reads. Cached for 30 s per process — one read per burst, not per job.
 */
export async function isWorkerAlive(now: Date = new Date()): Promise<boolean> {
  if (aliveCache && now.getTime() - aliveCache.at < ALIVE_CACHE_MS) return aliveCache.alive

  const alive = (await workerStatus(now)) === 'ok'

  aliveCache = { at: now.getTime(), alive }

  return alive
}
