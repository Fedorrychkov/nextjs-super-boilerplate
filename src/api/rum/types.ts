import { RumMetricName } from './model'

export type RumMetricRow = {
  name: string
  count: number
  avg: number | null
  min: number | null
  max: number | null
  p75: number | null
}

export type RumPathnameRow = {
  pathname: string
  count: number
}

export type RumDashboardPayload = {
  windowDays: number
  since: string
  until: string
  totalSamples: number
  byMetric: RumMetricRow[]
  topPathnames: RumPathnameRow[]
}

/** Client → POST /api/v1/rum (no commit hash). */
export type RumIngestBody = {
  name: RumMetricName
  value: number
  rating?: string
  id?: string
  navigationType?: string
  delta?: number
  pathname: string
  connectionEffectiveType?: string
}

export type RumFilter = {
  days: number
  pathname?: string | null
}
