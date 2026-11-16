import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { type AdminOverview, overviewAlerts } from './admin-overview-rules'

const counts = { published: 2, drafts: 1, scheduled: 0, overdue: 0 }

const healthy: AdminOverview = {
  db: 'ok',
  redis: 'ok',
  worker: 'ok',
  metricsSink: 'log',
  users: { total: 3, last7Days: 1, blocked: 0 },
  articles: counts,
  generatedAt: '2026-11-16T10:00:00.000Z',
}

describe('overviewAlerts', () => {
  it('is quiet when everything works', () => {
    assert.deepEqual(overviewAlerts(healthy), [])
  })

  it('does not alarm about a switched-off worker with nothing waiting for it', () => {
    assert.deepEqual(overviewAlerts({ ...healthy, worker: 'never', redis: 'off' }), [])
  })

  it('warns that scheduled articles will not publish without a worker', () => {
    const articles = { ...counts, scheduled: 2 }

    assert.deepEqual(overviewAlerts({ ...healthy, worker: 'never', articles }), ['scheduledWithoutWorker'])
    assert.deepEqual(overviewAlerts({ ...healthy, worker: 'stale', articles }), ['scheduledWithoutWorker'])
  })

  it('reports a worker that stopped beating even with nothing scheduled', () => {
    assert.deepEqual(overviewAlerts({ ...healthy, worker: 'stale' }), ['workerStale'])
  })

  it('flags overdue publications while the worker looks alive: the job is failing', () => {
    assert.deepEqual(overviewAlerts({ ...healthy, articles: { ...counts, scheduled: 1, overdue: 1 } }), ['overdueScheduled'])
  })

  it('puts infrastructure failures first', () => {
    assert.deepEqual(overviewAlerts({ ...healthy, db: 'fail', redis: 'fail', metricsSink: 'off' }), ['dbDown', 'redisDown', 'metricsOff'])
  })
})
