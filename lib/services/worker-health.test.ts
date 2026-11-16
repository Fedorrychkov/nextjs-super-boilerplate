import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { WORKER_BEAT_INTERVAL_MS, workerState } from './worker-health'

const now = new Date('2026-11-16T12:00:00.000Z')
const ago = (ms: number) => new Date(now.getTime() - ms)

describe('workerState', () => {
  it('is never without a mark — local development without a worker', () => {
    assert.equal(workerState(null, now), 'never')
  })

  it('tolerates up to three missed marks', () => {
    assert.equal(workerState(ago(10_000), now), 'ok')
    assert.equal(workerState(ago(3 * WORKER_BEAT_INTERVAL_MS), now), 'ok')
  })

  it('is stale past that', () => {
    assert.equal(workerState(ago(3 * WORKER_BEAT_INTERVAL_MS + 1), now), 'stale')
  })
})
