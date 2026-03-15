import { REDIS_URL } from '@config/env'
import Redis from 'ioredis'

import { Logger } from '~/utils/logger'

class RedisClient {
  private readonly redis: Redis | null = null

  private readonly logger = new Logger(['RedisClient', '[lib/redis.ts]'])

  constructor() {
    if (!REDIS_URL) {
      this.logger.warn('REDIS_URL is not set')

      return
    }

    this.redis = new Redis(REDIS_URL || '')
  }

  get client() {
    return this.redis
  }
}

export const redisClient = new RedisClient()
