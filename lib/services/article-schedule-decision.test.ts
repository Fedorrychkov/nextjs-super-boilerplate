import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { scheduleDecision, type ScheduleRequest } from './article-schedule-decision'

const now = new Date('2026-11-16T10:00:00.000Z')
const base: ScheduleRequest = { currentStatus: 'draft', nextStatus: 'draft', revisionId: 'r1', current: null, requested: undefined, now }

describe('scheduleDecision', () => {
  it('sets a future time with an offset on a draft with a revision', () => {
    assert.deepEqual(scheduleDecision({ ...base, requested: '2026-11-17T09:00:00+03:00' }), { kind: 'set', at: new Date('2026-11-17T06:00:00.000Z') })
    assert.deepEqual(scheduleDecision({ ...base, requested: '2026-11-17T06:00Z' }), { kind: 'set', at: new Date('2026-11-17T06:00:00.000Z') })
  })

  it('reschedules an unpublished article', () => {
    const verdict = scheduleDecision({ ...base, currentStatus: 'unpublished', nextStatus: 'unpublished', requested: '2026-11-17T06:00:00Z' })

    assert.equal(verdict.kind, 'set')
  })

  it('keeps or cancels', () => {
    assert.deepEqual(scheduleDecision(base), { kind: 'keep' })
    assert.deepEqual(scheduleDecision({ ...base, current: '2026-11-17T06:00:00Z' }), { kind: 'keep' })
    assert.deepEqual(scheduleDecision({ ...base, current: '2026-11-17T06:00:00Z', requested: null }), { kind: 'clear' })
    assert.deepEqual(scheduleDecision({ ...base, requested: null }), { kind: 'keep' })
  })

  it('refuses a time without an offset or one that is not a date', () => {
    assert.deepEqual(scheduleDecision({ ...base, requested: '2026-11-17T09:00' }), { kind: 'error', code: 'scheduleInvalid' })
    assert.deepEqual(scheduleDecision({ ...base, requested: 'tomorrow' }), { kind: 'error', code: 'scheduleInvalid' })
    assert.deepEqual(scheduleDecision({ ...base, requested: '2026-13-45T09:00:00Z' }), { kind: 'error', code: 'scheduleInvalid' })
  })

  it('refuses a time in the past, but tolerates "now" picked a few seconds ago', () => {
    assert.deepEqual(scheduleDecision({ ...base, requested: '2026-11-15T10:00:00Z' }), { kind: 'error', code: 'scheduleInPast' })
    assert.equal(scheduleDecision({ ...base, requested: '2026-11-16T09:59:30Z' }).kind, 'set')
  })

  it('needs a revision to publish', () => {
    assert.deepEqual(scheduleDecision({ ...base, revisionId: null, requested: '2026-11-17T06:00:00Z' }), { kind: 'error', code: 'scheduleNoRevision' })
  })

  it('a published article cannot be scheduled, and publishing by hand drops the schedule', () => {
    assert.deepEqual(scheduleDecision({ ...base, nextStatus: 'published', requested: '2026-11-17T06:00:00Z' }), { kind: 'error', code: 'schedulePublished' })
    assert.deepEqual(scheduleDecision({ ...base, nextStatus: 'published', current: '2026-11-17T06:00:00Z' }), { kind: 'clear' })
    assert.deepEqual(scheduleDecision({ ...base, currentStatus: 'published', nextStatus: 'published' }), { kind: 'keep' })
  })

  it('taking an article down drops its schedule instead of letting the worker bring it back', () => {
    assert.deepEqual(scheduleDecision({ ...base, nextStatus: 'unpublished', current: '2026-11-17T06:00:00Z' }), { kind: 'clear' })
    assert.deepEqual(scheduleDecision({ ...base, nextStatus: 'unpublished', requested: '2026-11-17T06:00:00Z' }), {
      kind: 'error',
      code: 'scheduleUnpublishing',
    })
  })
})
