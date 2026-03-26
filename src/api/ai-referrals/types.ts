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
