import { getClientKey, rateLimit } from '@lib/security/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

import { Logger } from '~/utils/logger'

export const withGlobalRateLimit = <T extends (request: NextRequest) => Promise<NextResponse>>(handler: T): T =>
  (async (request: NextRequest) => {
    const key = getClientKey(request)
    const logger = new Logger(['withGlobalRateLimit', '[lib/rate-limit.ts]', `consumed key: ${key}`])

    logger.warn('start')

    if (!key) {
      return handler(request)
    }

    try {
      const consumed = await rateLimit.consume(key)

      logger.warn({ consumed })
    } catch {
      return NextResponse.json(
        {
          message: 'Too many requests. Please try again later.',
        },
        { status: 429 },
      )
    }

    return handler(request)
  }) as T
