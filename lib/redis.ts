import { REDIS_URL } from '@config/env'
import Redis from 'ioredis'

import { logger } from '~/utils/logger'

class RedisClient {
  private readonly redis: Redis | null = null

  constructor() {
    if (!REDIS_URL) {
      logger.warn('REDIS_URL is not set')

      return
    }

    this.redis = new Redis(REDIS_URL || '')
  }

  get client() {
    return this.redis
  }
}

export const redisClient = new RedisClient()
