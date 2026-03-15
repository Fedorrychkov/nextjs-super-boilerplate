import { RATE_LIMIT_CONFIG } from '@config/env'
import { NextRequest, NextResponse } from 'next/server'
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible'

import { Logger } from '~/utils/logger'

import { redisClient } from './redis'

class RateLimit {
  private readonly limiter: RateLimiterMemory | RateLimiterRedis

  constructor() {
    const redis = redisClient.client

    if (!redis) {
      this.limiter = new RateLimiterMemory({
        points: RATE_LIMIT_CONFIG.points, // max requests
        duration: RATE_LIMIT_CONFIG.duration, // per 60 seconds
      })
    } else {
      this.limiter = new RateLimiterRedis({
        storeClient: redis,
        points: RATE_LIMIT_CONFIG.points, // max requests
        duration: RATE_LIMIT_CONFIG.duration, // per 60 seconds
      })
    }
  }

  get limit() {
    return this.limiter
  }
}

export const rateLimit = new RateLimit().limit

export const getClientKey = (request: NextRequest): string | undefined => {
  const xRealIp = request.headers.get('x-real-ip')
  const xClientIp = request.headers.get('x-client-ip')
  const ipFromHeader = xClientIp || xRealIp
  const ip = ipFromHeader || undefined

  return ip
}

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
