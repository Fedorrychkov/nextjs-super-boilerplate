import { RATE_LIMIT_CONFIG } from '@config/env'
import { NextRequest } from 'next/server'
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible'

import { redisClient } from '../redis'

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
