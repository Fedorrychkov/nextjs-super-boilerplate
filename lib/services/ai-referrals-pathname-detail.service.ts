import AiReferralVisit from '@lib/db/models/AiReferralVisit'
import mongoose from 'mongoose'

import type { AiReferralPathnameQueryStatsPayload, AiReferralPathnameVisitsPage } from '~/api/ai-referrals/types'
import { parseReferrerQueryParams } from '~/utils/parseReferrerQueryParams'

import { getAiReferralTimeBounds } from './ai-referrals-time-window'

const DEFAULT_VISITS_LIMIT = 30
const MAX_VISITS_LIMIT = 100

function createdAtToIso(raw: unknown): string | null {
  if (raw == null) {
    return null
  }

  const d = raw instanceof Date ? raw : new Date(raw as string | number)

  return Number.isFinite(d.getTime()) ? d.toISOString() : null
}

function toDateForCursor(raw: unknown): Date | null {
  if (raw == null) {
    return null
  }

  const d = raw instanceof Date ? raw : new Date(raw as string | number)

  return Number.isFinite(d.getTime()) ? d : null
}

function encodeVisitCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ t: createdAt.getTime(), i: id }), 'utf8').toString('base64url')
}

function decodeVisitCursor(cursor: string): { createdAt: Date; _id: mongoose.Types.ObjectId } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8')
    const o = JSON.parse(raw) as { t: number; i: string }

    if (typeof o.t !== 'number' || typeof o.i !== 'string' || !mongoose.Types.ObjectId.isValid(o.i)) {
      return null
    }

    return { createdAt: new Date(o.t), _id: new mongoose.Types.ObjectId(o.i) }
  } catch {
    return null
  }
}

function buildPathnameMatch(pathname: string, windowDays: number): Record<string, unknown> {
  const { since, until } = getAiReferralTimeBounds(windowDays)

  return {
    pathname,
    createdAt: { $gte: since, $lte: until },
  }
}

export async function listAiReferralVisitsForPathname(params: {
  pathname: string
  windowDays: number
  limit?: number
  cursor: string | null
}): Promise<AiReferralPathnameVisitsPage> {
  const { pathname, windowDays, cursor } = params
  const limit = Math.min(Math.max(params.limit ?? DEFAULT_VISITS_LIMIT, 1), MAX_VISITS_LIMIT)
  const baseMatch = buildPathnameMatch(pathname, windowDays)
  const match: Record<string, unknown> = { ...baseMatch }

  if (cursor) {
    const decoded = decodeVisitCursor(cursor)

    if (decoded) {
      match.$or = [{ createdAt: { $lt: decoded.createdAt } }, { createdAt: decoded.createdAt, _id: { $lt: decoded._id } }]
    }
  }

  const rows = await AiReferralVisit.find(match)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .lean()

  const hasMore = rows.length > limit
  const slice = hasMore ? rows.slice(0, limit) : rows
  const last = slice[slice.length - 1]
  const lastCreated = last ? toDateForCursor(last.createdAt) : null
  const nextCursor = hasMore && last?._id && lastCreated ? encodeVisitCursor(lastCreated, String(last._id)) : null

  return {
    items: slice.map((d) => ({
      id: String(d._id),
      source: d.source,
      pathname: d.pathname,
      referrer: d.referrer,
      referrerHost: d.referrerHost,
      createdAt: createdAtToIso(d.createdAt),
    })),
    nextCursor,
  }
}

/**
 * Один проход по событиям: считает, в скольких визитах встречался каждый query-ключ,
 * и частоты значений по каждому ключу (как в URL referrer).
 */
export async function aggregateReferrerQueryParamsForPathname(params: { pathname: string; windowDays: number }): Promise<AiReferralPathnameQueryStatsPayload> {
  const { pathname, windowDays } = params
  const match = buildPathnameMatch(pathname, windowDays)
  const valueCounts = new Map<string, Map<string, number>>()
  const visitCountByKey = new Map<string, number>()

  const cursor = AiReferralVisit.find(match).select('referrer').batchSize(250).lean().cursor()

  for await (const doc of cursor) {
    const pairs = parseReferrerQueryParams(typeof doc.referrer === 'string' ? doc.referrer : '')
    const keysInThisVisit = new Set<string>()

    for (const { key, value } of pairs) {
      keysInThisVisit.add(key)

      if (!valueCounts.has(key)) {
        valueCounts.set(key, new Map())
      }

      const vm = valueCounts.get(key)!
      vm.set(value, (vm.get(value) ?? 0) + 1)
    }

    for (const key of keysInThisVisit) {
      visitCountByKey.set(key, (visitCountByKey.get(key) ?? 0) + 1)
    }
  }

  const keys = [...visitCountByKey.entries()]
    .map(([key, visitCount]) => {
      const vm = valueCounts.get(key) ?? new Map()
      const values = [...vm.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))

      return { key, visitCount, values }
    })
    .sort((a, b) => b.visitCount - a.visitCount || a.key.localeCompare(b.key))

  return { keys }
}
