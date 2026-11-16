/**
 * Browser side of the metrics facade: page views (only with analytics consent) and uncaught errors,
 * batched to `POST /api/v1/ev/batch`. No SDK and no third-party script — the server decides where
 * events go (platform setting `metrics.sink`).
 */

const ENDPOINT = '/api/v1/ev/batch'
const ANON_KEY = 'nsb-metrics-anon'
const FLUSH_MS = 5_000
const MAX_QUEUE = 100
const ERROR_WINDOW_MS = 5 * 60 * 1000

type ClientEvent = {
  name: '$pageview' | '$exception'
  uuid: string
  route: string
  error?: { type: string; message: string; stack?: string }
}

let queue: ClientEvent[] = []
let timer: ReturnType<typeof setTimeout> | null = null
let lastRoute: string | null = null
const reportedErrors = new Map<string, number>()

const uuid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : '00000000-0000-4000-8000-000000000000')

function anonId(): string {
  try {
    const existing = localStorage.getItem(ANON_KEY)

    if (existing) return existing

    const created = uuid()

    localStorage.setItem(ANON_KEY, created)

    return created
  } catch {
    // Storage blocked: an id per page load is still better than none.
    return uuid()
  }
}

function body(events: ClientEvent[]): string {
  return JSON.stringify({ anonId: anonId(), events })
}

export function flush(useBeacon = false): void {
  if (timer) clearTimeout(timer)

  timer = null

  if (!queue.length) return

  const events = queue.splice(0, 50)

  // On page hide only `sendBeacon` is guaranteed to leave; otherwise a keepalive fetch.
  if (useBeacon && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
    navigator.sendBeacon(ENDPOINT, new Blob([body(events)], { type: 'application/json' }))
  } else {
    void fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(events), keepalive: true }).catch(() => undefined)
  }

  if (queue.length) schedule()
}

function schedule(): void {
  if (!timer) timer = setTimeout(() => flush(), FLUSH_MS)
}

function push(event: ClientEvent): void {
  if (queue.length >= MAX_QUEUE) queue = queue.slice(-MAX_QUEUE + 1)

  queue.push(event)
  schedule()
}

/** A page view; the same route twice in a row is one view (re-renders, query changes). */
export function trackPage(path: string): void {
  if (path === lastRoute) return

  lastRoute = path
  push({ name: '$pageview', uuid: uuid(), route: path })
}

/** An uncaught browser error, at most once per 5 minutes per type and message. The server scrubs the text. */
export function trackError(error: unknown, path: string): void {
  const type = error instanceof Error ? error.name || 'Error' : 'Error'
  const message = error instanceof Error ? error.message : String(error)

  // Browser noise that is not a defect of the page.
  if (/ResizeObserver loop|Script error\.?$/i.test(message)) return

  const key = `${type}:${message.slice(0, 120)}`
  const now = Date.now()
  const last = reportedErrors.get(key)

  if (last !== undefined && now - last < ERROR_WINDOW_MS) return

  reportedErrors.set(key, now)
  push({
    name: '$exception',
    uuid: uuid(),
    route: path,
    error: { type: type.slice(0, 80), message: message.slice(0, 1000), stack: error instanceof Error ? error.stack?.slice(0, 4000) : undefined },
  })
}
