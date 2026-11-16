import connectDB from '@lib/db/client'
import MetricEvent from '@lib/db/models/MetricEvent'
import { platformSettingsService } from '@lib/services/platform-settings.service'

export type MetricsSummary = {
  sink: string
  /** Only the `mongo` sink keeps events here; for others the page explains where they go. */
  available: boolean
  days: string[]
  events: { name: string; total: number; perDay: number[] }[]
  errors: { type: string; message: string; route: string | null; side: string; count: number; lastAt: string }[]
}

const DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

/** Events by name per day and recent errors grouped by message — what the admin page shows. No charts library, just counts. */
export async function metricsSummary(now: Date = new Date()): Promise<MetricsSummary> {
  const sink = await platformSettingsService.get('metrics.sink')
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (DAYS - 1) * DAY_MS)
  const days = Array.from({ length: DAYS }, (_, i) => new Date(start.getTime() + i * DAY_MS).toISOString().slice(0, 10))

  if (sink !== 'mongo') return { sink, available: false, days, events: [], errors: [] }

  await connectDB()

  const counts = await MetricEvent.aggregate<{ _id: { name: string; day: string }; count: number }>([
    { $match: { at: { $gte: start }, name: { $ne: '$exception' } } },
    { $group: { _id: { name: '$name', day: { $dateToString: { format: '%Y-%m-%d', date: '$at' } } }, count: { $sum: 1 } } },
  ])

  const byName = new Map<string, number[]>()

  for (const { _id, count } of counts) {
    const index = days.indexOf(_id.day)

    if (index < 0) continue

    const row = byName.get(_id.name) ?? Array<number>(DAYS).fill(0)

    row[index] = (row[index] ?? 0) + count
    byName.set(_id.name, row)
  }

  const errors = await MetricEvent.aggregate<{
    _id: { type: string; message: string; route: string | null; side: string }
    count: number
    lastAt: Date
  }>([
    { $match: { name: '$exception', at: { $gte: new Date(now.getTime() - 7 * DAY_MS) } } },
    { $group: { _id: { type: '$error.type', message: '$error.message', route: '$route', side: '$side' }, count: { $sum: 1 }, lastAt: { $max: '$at' } } },
    { $sort: { lastAt: -1 } },
    { $limit: 50 },
  ])

  return {
    sink,
    available: true,
    days,
    events: [...byName.entries()].map(([name, perDay]) => ({ name, total: perDay.reduce((sum, n) => sum + n, 0), perDay })).sort((a, b) => b.total - a.total),
    errors: errors.map(({ _id, count, lastAt }) => ({ ..._id, count, lastAt: lastAt.toISOString() })),
  }
}
