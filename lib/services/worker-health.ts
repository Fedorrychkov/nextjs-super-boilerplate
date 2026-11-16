/**
 * Is the worker alive — by the mark it leaves in the database.
 *
 * The worker has no HTTP and is invisible from outside: crashed, not connected to Redis or simply
 * not started, producers still report "queued". The mark in the database is the only trace the API
 * can check and show in the healthcheck.
 */

/** How often the worker marks itself. */
export const WORKER_BEAT_INTERVAL_MS = 60_000

/** Missed marks tolerated in a row: one or two are a restart or a slow database, not an outage. */
const MISSED_BEATS_TOLERATED = 3

export type WorkerState = 'ok' | 'stale' | 'never'

export function workerState(lastBeatAt: Date | null | undefined, now: Date, intervalMs: number = WORKER_BEAT_INTERVAL_MS): WorkerState {
  if (!lastBeatAt) return 'never'

  return now.getTime() - lastBeatAt.getTime() <= intervalMs * MISSED_BEATS_TOLERATED ? 'ok' : 'stale'
}
