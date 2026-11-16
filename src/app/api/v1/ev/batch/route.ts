import { verifyAccessToken } from '@lib/jwt/utils'
import { metrics } from '@lib/metrics'
import { getClientKey } from '@lib/security/rate-limit'
import { NextRequest, NextResponse } from 'next/server'
import { RateLimiterMemory } from 'rate-limiter-flexible'

/** A browser batch is small; more is not read. */
const MAX_BYTES = 32 * 1024

/** Its own budget: page views and errors must not eat the rate limit of real API calls. */
const batches = new RateLimiterMemory({ points: 60, duration: 60 })

const accepted = (count: number) => NextResponse.json({ accepted: count }, { status: 200 })

/**
 * Product events and browser errors from `src/lib/metrics/tracker.ts`. No sign-in required; a valid
 * access cookie only attributes the events to the user's pseudonymous id. Everything is filtered by
 * the closed event list and scrubbed in `metrics.ingestClient`. Always answers 200 so a tracker
 * never retries a refused batch in a loop.
 */
export const POST = async (request: NextRequest) => {
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BYTES) return accepted(0)

  try {
    await batches.consume(getClientKey(request) ?? 'unknown')
  } catch {
    return accepted(0)
  }

  const text = await request.text()

  if (text.length > MAX_BYTES) return accepted(0)

  let batch: unknown

  try {
    batch = JSON.parse(text)
  } catch {
    return accepted(0)
  }

  let userId: string | null = null
  const token = request.cookies.get('accessToken')?.value

  if (token) {
    try {
      userId = verifyAccessToken(token).sub
    } catch {
      userId = null
    }
  }

  return accepted(await metrics.ingestClient(batch, { userId }))
}
