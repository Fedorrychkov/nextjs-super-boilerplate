import type { MetricEventName, MetricProps } from './rules'

export type MetricEvent = {
  /** Client-made or server-made; a sink uses it to drop a replayed event. */
  uuid: string
  name: MetricEventName
  props: MetricProps
  /** `u_<hmac>` for a signed-in user, `a_<uuid>` for an anonymous browser, `server` otherwise. */
  distinctId: string
  side: 'server' | 'client'
  /** Route template (`/admin/users/:id`), never the raw path. */
  route: string | null
  env: string
  at: Date
  /** Only on `$exception`; already scrubbed. */
  error?: { type: string; message: string; stack?: string }
}

/**
 * Where events go. A fork adds its own with `registerMetricsSink` and picks `custom` in the platform
 * settings. `send` may throw: the facade logs it and the product goes on.
 */
export interface MetricsSink {
  send(events: MetricEvent[]): Promise<void>
}
