import connectDB from '@lib/db/client'
import MetricEvent from '@lib/db/models/MetricEvent'

import { Logger } from '~/utils/logger'

import type { MetricEvent as Event, MetricsSink } from './types'

const logger = new Logger(['metrics', '[lib/metrics/sinks.ts]'])

/** Default: one compact log line per event. Needs nothing and keeps nothing beyond the log. */
export const logSink: MetricsSink = {
  async send(events) {
    for (const event of events) {
      logger.info('metric', event.name, { route: event.route, side: event.side, props: event.props, ...(event.error ? { error: event.error } : {}) })
    }
  },
}

/** Into this project's database, kept `retentionDays` (TTL on `expireAt`); summarized in /admin/metrics. */
export const mongoSink = (retentionDays: number): MetricsSink => ({
  async send(events) {
    await connectDB()

    const expireAt = (at: Date) => new Date(at.getTime() + retentionDays * 24 * 60 * 60 * 1000)

    // `ordered: false` + unique uuid: a replayed batch (beacon after a fetch that did arrive) inserts
    // what is new and skips the rest instead of failing the whole batch.
    await MetricEvent.insertMany(
      events.map((event) => ({ ...event, error: event.error ?? null, expireAt: expireAt(event.at) })),
      { ordered: false },
    ).catch((error: { code?: number; writeErrors?: unknown[] }) => {
      const onlyDuplicates = Array.isArray(error.writeErrors) && error.writeErrors.every((item) => (item as { code?: number }).code === 11000)

      if (error.code !== 11000 && !onlyDuplicates) throw error
    })
  },
})

/**
 * PostHog batch API. No IP and no geo ever leave the server (`$ip: null`, `$geoip_disable`), and an
 * anonymous browser creates no person profile. Errors use PostHog's `$exception` shape so its error
 * tracking groups them.
 */
export const posthogSink = (host: string, apiKey: string): MetricsSink => ({
  async send(events) {
    if (!apiKey) throw new Error('metrics.posthogKey is not set')

    const batch = events.map((event: Event) => ({
      event: event.name,
      timestamp: event.at.toISOString(),
      uuid: event.uuid,
      properties: {
        distinct_id: event.distinctId,
        ...event.props,
        route: event.route,
        side: event.side,
        environment: event.env,
        $ip: null,
        $geoip_disable: true,
        ...(event.distinctId.startsWith('u_') ? {} : { $process_person_profile: false }),
        ...(event.error
          ? {
              $exception_list: [
                {
                  type: event.error.type,
                  value: event.error.message,
                  mechanism: { handled: false, synthetic: false },
                  ...(event.error.stack ? { stacktrace: { type: 'raw', frames: [{ raw: event.error.stack }] } } : {}),
                },
              ],
            }
          : {}),
      },
    }))

    const response = await fetch(`${host.replace(/\/+$/, '')}/batch/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, batch }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) throw new Error(`PostHog answered ${response.status}`)
  },
})

let customSink: MetricsSink | null = null

/** A fork's own sink (another analytics service, a queue, a file): register at startup, pick `custom` in the settings. */
export function registerMetricsSink(sink: MetricsSink | null): void {
  customSink = sink
}

export const registeredCustomSink = (): MetricsSink | null => customSink
