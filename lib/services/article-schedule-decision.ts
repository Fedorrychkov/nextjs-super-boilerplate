/**
 * Scheduled publishing: a person or an agent with the publish right sets a time, the worker job
 * `articles-scheduled` publishes. This is only the decision of what an article update does to the
 * schedule — no database, fully testable.
 *
 * "Scheduled" is not a status: an article that is not published and has `scheduledAt` is scheduled.
 */

const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/

/** A time a minute in the past is "now" picked in the form a few seconds ago, not a mistake. */
const PAST_TOLERANCE_MS = 60_000

export type ScheduleErrorCode = 'scheduleInvalid' | 'scheduleInPast' | 'schedulePublished' | 'scheduleNoRevision' | 'scheduleUnpublishing'

export type ScheduleRequest = {
  /** Status before the update. */
  currentStatus: string | null | undefined
  /** Status after the update: the one sent, or the current one. */
  nextStatus: string | null | undefined
  /** Revision that will go live: the one sent, or the current one. */
  revisionId: string | null | undefined
  /** The time already set. */
  current: Date | string | null | undefined
  /** The time sent: `undefined` — not sent, `null` — cancel. */
  requested: string | null | undefined
  now: Date
}

export type ScheduleVerdict = { kind: 'keep' } | { kind: 'clear' } | { kind: 'set'; at: Date } | { kind: 'error'; code: ScheduleErrorCode }

export function scheduleDecision({ currentStatus, nextStatus, revisionId, current, requested, now }: ScheduleRequest): ScheduleVerdict {
  const scheduled = current != null

  // A published article has nothing to schedule: a new revision on a live article is a republish
  // and goes out at once. Publishing by hand drops a pending schedule so the worker leaves it alone.
  if (nextStatus === 'published') {
    if (requested != null) return { kind: 'error', code: 'schedulePublished' }

    return scheduled ? { kind: 'clear' } : { kind: 'keep' }
  }

  // Taking an article down is a "not now"; a schedule left behind would bring it back on its own.
  if (nextStatus === 'unpublished' && currentStatus !== 'unpublished') {
    if (requested != null) return { kind: 'error', code: 'scheduleUnpublishing' }

    return scheduled ? { kind: 'clear' } : { kind: 'keep' }
  }

  if (requested === undefined) return { kind: 'keep' }

  if (requested === null) return scheduled ? { kind: 'clear' } : { kind: 'keep' }

  const at = new Date(requested)

  // An offset is required: "09:00" without one means a different moment on the server and in the browser.
  if (!ISO_WITH_OFFSET.test(requested) || Number.isNaN(at.getTime())) return { kind: 'error', code: 'scheduleInvalid' }

  if (at.getTime() < now.getTime() - PAST_TOLERANCE_MS) return { kind: 'error', code: 'scheduleInPast' }

  if (!revisionId) return { kind: 'error', code: 'scheduleNoRevision' }

  return { kind: 'set', at }
}
