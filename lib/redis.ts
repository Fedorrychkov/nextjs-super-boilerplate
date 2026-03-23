import { REDIS_URL } from '@config/env'
import Redis from 'ioredis'

import { Logger } from '~/utils/logger'

class RedisClient {
  private redis: Redis | null = null

  private readonly logger = new Logger(['RedisClient', '[lib/redis.ts]'])

  private getOrCreate(): Redis | null {
    if (this.redis) {
      return this.redis
    }

    if (!REDIS_URL) {
      this.logger.warn('REDIS_URL is not set')

      return null
    }

    this.redis = new Redis(REDIS_URL, {
      /**
       * Important for build phase:
       * do not connect to Redis on import-time.
       */
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    })

    this.redis.on('error', (error) => {
      this.logger.warn('Redis client error', { error: error.message })
    })

    return this.redis
  }

  get client() {
    return this.getOrCreate()
  }
}

export const redisClient = new RedisClient()
