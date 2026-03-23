import type { QueryFilter } from 'mongoose'

import { time } from '~/utils/time'

/**
 * Range by `createdAt`.
 *
 * In the schemas the field is declared as `Date` — in Mongo you need to pass **Date**, not ISO strings:
 * otherwise comparison with BSON Date in the document often does not work and the list is empty.
 *
 * Additionally: invalid string is discarded; when `from > to` the boundaries are swapped.
 */
export function applyCreatedAtRange<T extends { createdAt?: unknown }>(q: QueryFilter<T>, startOfDateIso?: string | null, endOfDateIso?: string | null): void {
  const start = toIsoBound(startOfDateIso)
  const end = toIsoBound(endOfDateIso)

  if (!start && !end) {
    return
  }

  let gte = start
  let lte = end

  if (gte && lte && gte > lte) {
    ;[gte, lte] = [lte, gte]
  }

  const range: { $gte?: Date; $lte?: Date } = {}

  if (gte) {
    const d = new Date(gte)

    if (!Number.isNaN(d.getTime())) {
      range.$gte = d
    }
  }

  if (lte) {
    const d = new Date(lte)

    if (!Number.isNaN(d.getTime())) {
      range.$lte = d
    }
  }

  if (Object.keys(range).length === 0) {
    return
  }

  q.createdAt = range as QueryFilter<T>['createdAt']
}

function toIsoBound(raw?: string | null): string | null {
  if (raw == null) {
    return null
  }

  const s = String(raw).trim()

  if (!s) {
    return null
  }

  const t = time(s)

  if (!t.isValid()) {
    return null
  }

  const iso = t.toISOString()

  return iso ?? null
}
