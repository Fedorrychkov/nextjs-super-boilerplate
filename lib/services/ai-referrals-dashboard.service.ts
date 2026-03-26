import AiReferralVisit from '@lib/db/models/AiReferralVisit'

import { AI_REFERRAL_SOURCES } from '~/api/ai-referrals/model'
import { AiReferralDashboardPayload, AiRefferralFilter } from '~/api/ai-referrals/types'

export async function buildAiReferralsDashboard(filter: AiRefferralFilter): Promise<AiReferralDashboardPayload> {
  const until = new Date()
  const { days, pathname } = filter
  const windowDays = days || 7

  const since = new Date(until.getTime() - windowDays * 24 * 60 * 60 * 1000)
  const match = { createdAt: { $gte: since, $lte: until } } as Record<string, unknown>
  const normalizedPathname = pathname?.trim()

  if (normalizedPathname) {
    match.pathname = normalizedPathname
  }

  const totalSamples = await AiReferralVisit.countDocuments(match)

  const topPathnames = await AiReferralVisit.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: '$pathname', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]).then((rows) => rows.map((row) => ({ pathname: row._id, count: row.count })))

  const bySourceRows = await AiReferralVisit.aggregate<{ _id: string; count: number }>([
    { $match: match },
    { $group: { _id: '$source', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ])

  const countBySource = new Map(bySourceRows.map((row) => [row._id, row.count]))

  const bySource = AI_REFERRAL_SOURCES.map((source) => ({
    source,
    count: countBySource.get(source) ?? 0,
  }))

  return {
    windowDays,
    since: since.toISOString(),
    until: until.toISOString(),
    totalSamples,
    bySource,
    topPathnames,
  }
}
