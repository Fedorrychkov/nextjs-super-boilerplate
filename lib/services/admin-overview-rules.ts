import type { WorkerState } from './worker-health'

export type ProbeState = 'ok' | 'fail' | 'off'

export type AdminOverview = {
  db: ProbeState
  redis: ProbeState
  worker: WorkerState | 'unknown'
  metricsSink: string
  /** `null` when the database did not answer. */
  users: { total: number; last7Days: number; blocked: number } | null
  articles: { published: number; drafts: number; scheduled: number; overdue: number } | null
  generatedAt: string
}

export type OverviewAlert = 'dbDown' | 'redisDown' | 'scheduledWithoutWorker' | 'workerStale' | 'overdueScheduled' | 'metricsOff'

/**
 * What needs the owner's attention, most serious first. The overview exists to answer "is anything
 * broken right now" before "how many": a dead worker matters only when there is work waiting for it
 * — the worker is off by default, and off with nothing scheduled is a normal state, not an alarm.
 */
export function overviewAlerts(overview: AdminOverview): OverviewAlert[] {
  const alerts: OverviewAlert[] = []

  if (overview.db === 'fail') alerts.push('dbDown')

  if (overview.redis === 'fail') alerts.push('redisDown')

  const scheduled = overview.articles?.scheduled ?? 0
  const overdue = overview.articles?.overdue ?? 0

  if (overview.worker !== 'ok' && scheduled > 0) alerts.push('scheduledWithoutWorker')
  else if (overview.worker === 'stale') alerts.push('workerStale')

  // The worker looks alive yet a publication is past due: the job itself is failing.
  if (overview.worker === 'ok' && overdue > 0) alerts.push('overdueScheduled')

  if (overview.metricsSink === 'off') alerts.push('metricsOff')

  return alerts
}
