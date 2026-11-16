import { randomUUID } from 'node:crypto'

import { JWT_CONFIG } from '@config/env'
import { platformSettingsService } from '@lib/services/platform-settings.service'

import { Logger } from '~/utils/logger'

import { acceptEvent, anonymousDistinctId, distinctIdForUser, type MetricProps, routeTemplate, scrubStack, scrubText, shouldReportError } from './rules'
import { logSink, mongoSink, posthogSink, registeredCustomSink } from './sinks'
import type { MetricEvent, MetricsSink } from './types'

export { registerMetricsSink } from './sinks'
export type { MetricEvent, MetricsSink } from './types'

const logger = new Logger(['metrics', '[lib/metrics/index.ts]'])

const ENV = process.env.APP_ENV ?? 'development'
const MAX_CLIENT_EVENTS = 50
const reported = new Map<string, number>()

type Context = { userId?: string | null; route?: string | null }

const distinctId = (ctx: Context, anonymous: string | null = null) => (ctx.userId ? distinctIdForUser(ctx.userId, JWT_CONFIG.secret) : (anonymous ?? 'server'))

/** The sink chosen in the platform settings, or `null` for `off`. */
async function resolveSink(): Promise<MetricsSink | null> {
  const choice = await platformSettingsService.get('metrics.sink')

  switch (choice) {
    case 'off':
      return null
    case 'mongo':
      return mongoSink(await platformSettingsService.get('metrics.retentionDays'))
    case 'posthog':
      return posthogSink(await platformSettingsService.get('metrics.posthogHost'), await platformSettingsService.get('metrics.posthogKey'))
    case 'custom': {
      const custom = registeredCustomSink()

      if (!custom) logger.warn('sink', 'metrics.sink=custom but no sink is registered (registerMetricsSink) — using the log')

      return custom ?? logSink
    }
    default:
      return logSink
  }
}

/** Never throws and is never awaited by the product path: metrics must not break the action they describe. */
async function deliver(events: MetricEvent[]): Promise<void> {
  if (!events.length) return

  try {
    const sink = await resolveSink()

    await sink?.send(events)
  } catch (error) {
    logger.warn('deliver', 'metrics sink failed — events dropped', { count: events.length, message: error instanceof Error ? error.message : String(error) })
  }
}

function errorEvent(error: unknown, ctx: Context, side: 'server' | 'client', anonymous: string | null = null): MetricEvent | null {
  const type = error instanceof Error ? error.name || 'Error' : 'Error'
  const message = scrubText(error instanceof Error ? error.message : String(error))

  if (!shouldReportError(reported, `${side}:${type}:${message.slice(0, 120)}`, Date.now())) return null

  return {
    uuid: randomUUID(),
    name: '$exception',
    props: {},
    distinctId: distinctId(ctx, anonymous),
    side,
    route: ctx.route ? routeTemplate(ctx.route) : null,
    env: ENV,
    at: new Date(),
    error: { type: scrubText(type, 80), message, stack: scrubStack(error instanceof Error ? error.stack : undefined) },
  }
}

export const metrics = {
  /** A server-side product event from the closed list (`lib/metrics/rules.ts`). Fire and forget. */
  track(name: string, props: MetricProps = {}, ctx: Context = {}): void {
    const accepted = acceptEvent(name, props, false)

    if (!accepted) {
      logger.warn('track', `unknown metric event "${name}" — add it to METRIC_EVENTS`)

      return
    }

    void deliver([
      {
        uuid: randomUUID(),
        ...accepted,
        distinctId: distinctId(ctx),
        side: 'server',
        route: ctx.route ? routeTemplate(ctx.route) : null,
        env: ENV,
        at: new Date(),
      },
    ])
  },

  /** An unexpected server error (500 from an API route, a job that failed for good). Scrubbed, throttled, fire and forget. */
  error(error: unknown, ctx: Context = {}): void {
    void (async () => {
      try {
        if (!(await platformSettingsService.get('metrics.errors'))) return
      } catch {
        return
      }

      const event = errorEvent(error, ctx, 'server')

      if (event) await deliver([event])
    })()
  },

  /**
   * A batch from the browser (`POST /api/v1/ev/batch`): only events allowed from a client, ids in
   * the expected shapes, errors scrubbed and throttled. Returns how many were accepted.
   */
  async ingestClient(batch: unknown, ctx: Context = {}): Promise<number> {
    if (!batch || typeof batch !== 'object') return 0

    const { anonId, events } = batch as { anonId?: unknown; events?: unknown }

    if (!Array.isArray(events)) return 0

    const anonymous = anonymousDistinctId(anonId)
    const errorsOn = await platformSettingsService.get('metrics.errors').catch(() => false)
    const out: MetricEvent[] = []

    for (const raw of events.slice(0, MAX_CLIENT_EVENTS)) {
      if (!raw || typeof raw !== 'object') continue

      const item = raw as { name?: unknown; uuid?: unknown; route?: unknown; error?: { type?: unknown; message?: unknown; stack?: unknown } }
      const route = typeof item.route === 'string' ? routeTemplate(item.route.slice(0, 300)) : null

      if (item.name === '$exception') {
        if (!errorsOn || !item.error) continue

        const error = Object.assign(new Error(String(item.error.message ?? '')), {
          name: String(item.error.type ?? 'Error').slice(0, 80),
          stack: typeof item.error.stack === 'string' ? item.error.stack.slice(0, 4000) : undefined,
        })
        const event = errorEvent(error, { ...ctx, route }, 'client', anonymous)

        if (event) out.push(event)

        continue
      }

      const accepted = typeof item.name === 'string' ? acceptEvent(item.name, {}, true) : null

      if (!accepted) continue

      out.push({
        uuid: typeof item.uuid === 'string' && /^[0-9a-f-]{36}$/i.test(item.uuid) ? item.uuid : randomUUID(),
        ...accepted,
        distinctId: distinctId(ctx, anonymous),
        side: 'client',
        route,
        env: ENV,
        at: new Date(),
      })
    }

    void deliver(out)

    return out.length
  },
}
