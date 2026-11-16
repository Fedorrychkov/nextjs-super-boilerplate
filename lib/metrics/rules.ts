import { createHmac } from 'node:crypto'

/**
 * Metrics rules — pure, shared by the server facade, the ingestion route and tests.
 *
 * The event list is closed and every property is an enum value or a boolean: free text cannot
 * reach a sink, so personal data cannot either. Errors are the one exception and go through
 * `scrubText` first.
 */
export const METRIC_EVENTS = {
  $pageview: { client: true, props: {} },
  'auth:login': { client: false, props: { method: ['password', 'mfa', 'oauth'] } },
  'auth:signup': { client: false, props: { method: ['email', 'oauth', 'admin'] } },
  'article:published': { client: false, props: { how: ['manual', 'scheduled'] } },
} as const satisfies Record<string, { client: boolean; props: Record<string, readonly string[]> }>

export type MetricEventName = keyof typeof METRIC_EVENTS | '$exception'
export type MetricProps = Record<string, string | boolean>

/**
 * Keep an event only if it is known (and allowed from a browser when `fromClient`), dropping every
 * property that is not listed or has an unlisted value. `null` — drop the event.
 */
export function acceptEvent(name: string, props: unknown, fromClient: boolean): { name: MetricEventName; props: MetricProps } | null {
  if (!Object.hasOwn(METRIC_EVENTS, name)) return null

  const definition = METRIC_EVENTS[name as keyof typeof METRIC_EVENTS]

  if (fromClient && !definition.client) return null

  const allowed = definition.props as Record<string, readonly string[]>
  const clean: MetricProps = {}

  if (props && typeof props === 'object') {
    for (const [key, value] of Object.entries(props as Record<string, unknown>)) {
      const options = allowed[key]

      if (options && typeof value === 'string' && options.includes(value)) clean[key] = value
    }
  }

  return { name: name as MetricEventName, props: clean }
}

// Two forms on purpose: `.test()` on a /g regex keeps `lastIndex` between calls and answers
// differently for the same input; the whole-segment checks never use the global flag.
const OBJECT_ID = /\b[0-9a-f]{24}\b/gi
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi
const IS_OBJECT_ID = /^[0-9a-f]{24}$/i
const IS_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** A path as a template: ids and numbers become `:id`, the query and hash are dropped. */
export function routeTemplate(path: string): string {
  const clean = path.split(/[?#]/)[0] || '/'

  return clean
    .split('/')
    .map((segment) => (IS_OBJECT_ID.test(segment) || IS_UUID.test(segment) || /^\d+$/.test(segment) ? ':id' : segment))
    .join('/')
    .replace(/(?<=.)\/+$/, '')
}

/** Error text without what identifies a person or opens a door: emails, tokens, ids, query strings, long numbers. */
export function scrubText(text: string, max = 300): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>')
    .replace(/\beyJ[\w-]+\.[\w-]+\.[\w-]+/g, '<jwt>')
    .replace(UUID, '<uuid>')
    .replace(OBJECT_ID, '<id>')
    .replace(/\?[^\s'")]+/g, '?<query>')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '<token>')
    .replace(/\b\d{6,}\b/g, '<number>')
    .slice(0, max)
}

/** Stack: first lines only, scrubbed — enough to find the place, not a dump of the process. */
export function scrubStack(stack: string | undefined, maxLines = 20): string | undefined {
  if (!stack) return undefined

  return stack
    .split('\n')
    .slice(0, maxLines)
    .map((line) => scrubText(line, 400))
    .join('\n')
}

/**
 * The same error goes out at most once per window per process: an error in a loop must not flood
 * the sink. Pure — the caller keeps the map.
 */
export function shouldReportError(seen: Map<string, number>, key: string, now: number, windowMs = 5 * 60 * 1000): boolean {
  const last = seen.get(key)

  if (last !== undefined && now - last < windowMs) return false

  seen.set(key, now)

  // Bound the map: old keys go once it grows.
  if (seen.size > 500) {
    for (const [stale, at] of seen) if (now - at >= windowMs) seen.delete(stale)
  }

  return true
}

/**
 * A stable pseudonymous id for a signed-in user: the same person is one id across events, but the
 * sink never sees the account id. Keyed by a server secret, so it cannot be reversed by hashing ids.
 */
export function distinctIdForUser(userId: string, secret: string): string {
  return `u_${createHmac('sha256', secret).update(`metrics:${userId}`).digest('hex').slice(0, 24)}`
}

/** An anonymous id from a browser: a client-made UUID, accepted only in that shape. */
export function anonymousDistinctId(raw: unknown): string | null {
  return typeof raw === 'string' && /^[0-9a-f-]{36}$/i.test(raw) ? `a_${raw.toLowerCase()}` : null
}
