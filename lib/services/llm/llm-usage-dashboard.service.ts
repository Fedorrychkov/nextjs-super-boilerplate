import LlmUsageEvent, { type LlmUsageSource } from '@lib/db/models/LlmUsageEvent'
import mongoose from 'mongoose'

import { time } from '~/utils/time'

export type LlmUsageTotals = {
  eventCount: number
  totalPromptTokens: number
  totalCompletionTokens: number
  totalTokens: number
}

export type LlmUsageBySourceRow = {
  source: LlmUsageSource
  count: number
  totalTokens: number
}

export type LlmUsageTopUserRow = {
  userId: string
  eventCount: number
  totalTokens: number
}

export type LlmUsageRecentEventRow = {
  id: string
  source: LlmUsageSource
  userId: string
  llmModel: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  articleId: string | null
  revisionId: string | null
  createdAt: string
}

export async function buildLlmUsageDashboard(params: { days: number }): Promise<{
  since: string
  until: string
  days: number
  totals: LlmUsageTotals
  bySource: LlmUsageBySourceRow[]
  topUsers: LlmUsageTopUserRow[]
  recent: LlmUsageRecentEventRow[]
}> {
  const days = Math.max(1, Math.min(90, params.days))
  const until = time().toISOString()
  const since = time().subtract(days, 'day').toISOString()

  const match = { createdAt: { $gte: since, $lte: until } }

  const [totAgg] = await LlmUsageEvent.aggregate<{
    eventCount: number
    totalPromptTokens: number
    totalCompletionTokens: number
    totalTokens: number
  }>([
    { $match: match },
    {
      $group: {
        _id: null,
        eventCount: { $sum: 1 },
        totalPromptTokens: { $sum: '$promptTokens' },
        totalCompletionTokens: { $sum: '$completionTokens' },
        totalTokens: { $sum: '$totalTokens' },
      },
    },
  ])

  const totals: LlmUsageTotals = totAgg
    ? {
        eventCount: totAgg.eventCount,
        totalPromptTokens: totAgg.totalPromptTokens,
        totalCompletionTokens: totAgg.totalCompletionTokens,
        totalTokens: totAgg.totalTokens,
      }
    : {
        eventCount: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
      }

  const bySourceRaw = await LlmUsageEvent.aggregate<{ _id: LlmUsageSource; count: number; totalTokens: number }>([
    { $match: match },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        totalTokens: { $sum: '$totalTokens' },
      },
    },
    { $sort: { _id: 1 } },
  ])

  const bySource: LlmUsageBySourceRow[] = bySourceRaw.map((r) => ({
    source: r._id,
    count: r.count,
    totalTokens: r.totalTokens,
  }))

  const topUsersRaw = await LlmUsageEvent.aggregate<{ _id: string; eventCount: number; totalTokens: number }>([
    { $match: match },
    {
      $group: {
        _id: '$userId',
        eventCount: { $sum: 1 },
        totalTokens: { $sum: '$totalTokens' },
      },
    },
    { $sort: { totalTokens: -1 } },
    { $limit: 25 },
  ])

  const topUsers: LlmUsageTopUserRow[] = topUsersRaw.map((r) => ({
    userId: r._id,
    eventCount: r.eventCount,
    totalTokens: r.totalTokens,
  }))

  const recentDocs = await LlmUsageEvent.find(match).sort({ createdAt: -1 }).limit(50).lean()

  const recent: LlmUsageRecentEventRow[] = recentDocs.map((d) => ({
    id: String(d._id),
    source: d.source as LlmUsageSource,
    userId: d.userId,
    llmModel: d.llmModel,
    promptTokens: d.promptTokens,
    completionTokens: d.completionTokens,
    totalTokens: d.totalTokens,
    articleId: d.articleId ? String(d.articleId) : null,
    revisionId: d.revisionId ? String(d.revisionId) : null,
    createdAt: d.createdAt,
  }))

  return {
    since,
    until,
    days,
    totals,
    bySource,
    topUsers,
    recent,
  }
}

export async function buildLlmUsageForArticleRevision(params: { articleId: string; revisionId: string; userId: string }): Promise<{
  totals: LlmUsageTotals
  bySource: LlmUsageBySourceRow[]
}> {
  const aid = new mongoose.Types.ObjectId(params.articleId)
  const rid = new mongoose.Types.ObjectId(params.revisionId)

  const baseMatch = {
    userId: params.userId,
    articleId: aid,
    revisionId: rid,
  }

  const [totAgg] = await LlmUsageEvent.aggregate<{
    eventCount: number
    totalPromptTokens: number
    totalCompletionTokens: number
    totalTokens: number
  }>([
    { $match: baseMatch },
    {
      $group: {
        _id: null,
        eventCount: { $sum: 1 },
        totalPromptTokens: { $sum: '$promptTokens' },
        totalCompletionTokens: { $sum: '$completionTokens' },
        totalTokens: { $sum: '$totalTokens' },
      },
    },
  ])

  const totals: LlmUsageTotals = totAgg
    ? {
        eventCount: totAgg.eventCount,
        totalPromptTokens: totAgg.totalPromptTokens,
        totalCompletionTokens: totAgg.totalCompletionTokens,
        totalTokens: totAgg.totalTokens,
      }
    : {
        eventCount: 0,
        totalPromptTokens: 0,
        totalCompletionTokens: 0,
        totalTokens: 0,
      }

  const bySourceRaw = await LlmUsageEvent.aggregate<{ _id: LlmUsageSource; count: number; totalTokens: number }>([
    { $match: baseMatch },
    {
      $group: {
        _id: '$source',
        count: { $sum: 1 },
        totalTokens: { $sum: '$totalTokens' },
      },
    },
    { $sort: { _id: 1 } },
  ])

  const bySource: LlmUsageBySourceRow[] = bySourceRaw.map((r) => ({
    source: r._id,
    count: r.count,
    totalTokens: r.totalTokens,
  }))

  return { totals, bySource }
}
