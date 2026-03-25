import { getClientKey, rateLimit } from '@lib/security/rate-limit'
import { NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequest } from '~/lib/i18n'
import { Logger } from '~/utils/logger'

import type { RouteHandlerContext } from './auth-middleware'

type RouteHandler = (request: NextRequest, context: RouteHandlerContext) => Promise<NextResponse>

export const withGlobalRateLimit = <T extends RouteHandler>(handler: T): T =>
  (async (request: NextRequest, context: RouteHandlerContext) => {
    const { t } = getServerTFromNextRequest(request)
    const key = getClientKey(request)
    const logger = new Logger(['withGlobalRateLimit', '[lib/rate-limit.ts]', `consumed key: ${key}`])

    logger.warn('start')

    if (!key) {
      return handler(request, context)
    }

    try {
      const consumed = await rateLimit.consume(key)

      logger.warn({ consumed })
    } catch {
      return NextResponse.json(
        {
          message: t('errors.tooManyRequests'),
        },
        { status: 429 },
      )
    }

    return handler(request, context)
  }) as T
