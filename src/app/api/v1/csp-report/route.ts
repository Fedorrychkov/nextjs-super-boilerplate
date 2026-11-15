import { cspViolations } from '@lib/security/csp-report'
import { getClientKey } from '@lib/security/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { RateLimiterMemory } from 'rate-limiter-flexible'

import { Logger } from '~/utils/logger'

const logger = new Logger(['security', '[src/app/api/v1/csp-report/route.ts]'])

/** A browser report is small; anything larger is not read (keeps the log from being flooded). */
const MAX_BYTES = 16 * 1024

/**
 * Its own budget, not the global API limit: Firefox and Safari send one POST per violation, and
 * reports must not eat the rate limit of real requests. Over the budget a report is dropped.
 */
const reports = new RateLimiterMemory({ points: 30, duration: 60 })

const noContent = () => new NextResponse(null, { status: 204 })

/** Reads at most MAX_BYTES as a stream: without Content-Length, `text()` would read everything. */
async function readCapped(request: NextRequest): Promise<string | null> {
  const reader = request.body?.getReader()

  if (!reader) return ''

  const chunks: Uint8Array[] = []
  let size = 0

  for (;;) {
    const { done, value } = await reader.read()

    if (done) break

    size += value.byteLength

    if (size > MAX_BYTES) {
      await reader.cancel()

      return null
    }

    chunks.push(value)
  }

  return new TextDecoder().decode(Buffer.concat(chunks))
}

/**
 * Violations of the report-only policy (config/csp.ts). No sign-in: the browser sends reports by
 * itself. Always 204 — the browser does nothing with the answer.
 */
export const POST = async (request: NextRequest) => {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES) return noContent()

  try {
    await reports.consume(getClientKey(request) ?? 'unknown')
  } catch {
    return noContent()
  }

  const text = await readCapped(request)

  if (text === null) return noContent()

  let payload: unknown

  try {
    payload = JSON.parse(text)
  } catch {
    return noContent()
  }

  for (const violation of cspViolations(payload)) {
    logger.warn('csp-report', 'report-only CSP violation', violation)
  }

  return noContent()
}
