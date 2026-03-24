/** Web Vitals metric names from the `web-vitals` package */
export const RUM_METRIC_NAMES = ['CLS', 'FCP', 'INP', 'LCP', 'TTFB'] as const
export type RumMetricName = (typeof RUM_METRIC_NAMES)[number]

export type RumWebVitalModel = {
  id: string
  name: RumMetricName
  value: number
  rating?: string | null
  metricId?: string | null
  navigationType?: string | null
  pathname: string
  delta?: number | null
  commitHash?: string | null
  appEnv?: string | null
  connectionEffectiveType?: string | null
  createdAt?: string | null
}
