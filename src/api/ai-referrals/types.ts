import { AiReferralSource } from './model'

export type AiReferralSourceRow = {
  source: AiReferralSource
  count: number
}

export type AiReferralPathnameRow = {
  pathname: string
  count: number
}

export type AiReferralDashboardPayload = {
  windowDays: number
  since: string
  until: string
  totalSamples: number
  bySource: AiReferralSourceRow[]
  topPathnames: AiReferralPathnameRow[]
}

export type AiRefferralFilter = {
  days: number
  pathname?: string | null
  source?: AiReferralSource | null
}

export type AiReferralVisitListItem = {
  id: string
  source: AiReferralSource
  pathname: string
  referrer: string
  referrerHost: string
  createdAt: string | null
}

export type AiReferralPathnameVisitsPage = {
  items: AiReferralVisitListItem[]
  nextCursor: string | null
}

export type AiReferralQueryParamValueStat = {
  value: string
  count: number
}

export type AiReferralQueryParamKeyStat = {
  key: string
  visitCount: number
  values: AiReferralQueryParamValueStat[]
}

export type AiReferralPathnameQueryStatsPayload = {
  keys: AiReferralQueryParamKeyStat[]
}
