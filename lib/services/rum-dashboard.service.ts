import RumWebVital from '@lib/db/models/RumWebVital'

import { RUM_METRIC_NAMES } from '~/api/rum/model'
import { RumDashboardPayload } from '~/api/rum/types'

function percentile75(values: number[]): number | null {
  if (!values.length) {
    return null
  }

  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * 0.75))

  return sorted[idx]
}

export async function buildRumDashboard(windowDays: number): Promise<RumDashboardPayload> {
  const until = new Date()
  const since = new Date(until.getTime() - windowDays * 24 * 60 * 60 * 1000)
  const match = { createdAt: { $gte: since, $lte: until } } as Record<string, unknown>

  const totalSamples = await RumWebVital.countDocuments(match)

  const topPathnames = await RumWebVital.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: '$pathname', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]).then((rows) => rows.map((r) => ({ pathname: r._id, count: r.count })))

  const byMetric = await Promise.all(
    RUM_METRIC_NAMES.map(async (name) => {
      const rows = await RumWebVital.find({ name, ...match })
        .select('value')
        .lean()
      const values = rows.map((r) => r.value)

      if (!values.length) {
        return {
          name,
          count: 0,
          avg: null,
          min: null,
          max: null,
          p75: null,
        }
      }

      const sum = values.reduce((a, b) => a + b, 0)

      return {
        name,
        count: values.length,
        avg: sum / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p75: percentile75(values),
      }
    }),
  )

  return {
    windowDays,
    since: since.toISOString(),
    until: until.toISOString(),
    totalSamples,
    byMetric,
    topPathnames,
  }
}
