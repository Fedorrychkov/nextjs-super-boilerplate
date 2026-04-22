import { APP_ENV, COMMIT_HASH, RUM_CONFIG } from '@config/env'
import connectDB from '@lib/db/client'
import RumWebVital from '@lib/db/models/RumWebVital'
import { withGlobalRateLimit } from '@lib/middleware'
import type { RouteHandlerContext } from '@lib/middleware/auth-middleware'
import { NextRequest, NextResponse } from 'next/server'

import { RUM_METRIC_NAMES } from '~/api/rum/model'
import type { RumIngestBody } from '~/api/rum/types'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const isValidMetricName = (n: unknown): n is RumIngestBody['name'] => typeof n === 'string' && (RUM_METRIC_NAMES as readonly string[]).includes(n)

const handler = async (request: NextRequest, _context: RouteHandlerContext) => {
  const { t } = await getServerTFromNextRequestAsync(request)

  if (!RUM_CONFIG.enabled) {
    return new NextResponse(null, { status: 204 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: t('rum.errors.invalidJson') }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ message: t('rum.errors.invalidBody') }, { status: 400 })
  }

  const b = body as Record<string, unknown>
  const name = b.name
  const value = b.value
  const pathname = b.pathname

  if (!isValidMetricName(name)) {
    return NextResponse.json({ message: t('rum.errors.invalidMetricName') }, { status: 400 })
  }

  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return NextResponse.json({ message: t('rum.errors.invalidValue') }, { status: 400 })
  }

  if (typeof pathname !== 'string' || pathname.length > 1024) {
    return NextResponse.json({ message: t('rum.errors.invalidPathname') }, { status: 400 })
  }

  const commitHash = COMMIT_HASH?.trim() || null

  try {
    await connectDB()

    await RumWebVital.create({
      name,
      value,
      rating: typeof b.rating === 'string' ? b.rating : null,
      metricId: typeof b.id === 'string' ? b.id : null,
      navigationType: typeof b.navigationType === 'string' ? b.navigationType : null,
      pathname,
      delta: typeof b.delta === 'number' && Number.isFinite(b.delta) ? b.delta : null,
      commitHash,
      appEnv: APP_ENV,
      connectionEffectiveType: typeof b.connectionEffectiveType === 'string' ? b.connectionEffectiveType : null,
    })
  } catch {
    return NextResponse.json({ message: t('rum.errors.failedToPersist') }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}

export const POST = withGlobalRateLimit(handler)
