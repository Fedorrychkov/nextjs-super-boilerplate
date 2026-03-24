import { REDIS_URL } from '@config/env'
import Redis from 'ioredis'

import { Logger } from '~/utils/logger'

import { shouldSkipDbDuringBuild } from './build-phase'

class RedisClient {
  private redis: Redis | null = null

  private readonly logger = new Logger(['RedisClient', '[lib/redis.ts]'])

  private getOrCreate(): Redis | null {
    if (this.redis) {
      return this.redis
    }

    if (shouldSkipDbDuringBuild()) {
      return null
    }

    if (!REDIS_URL) {
      this.logger.warn('REDIS_URL is not set')

      return null
    }

    this.redis = new Redis(REDIS_URL, {
      /**
       * `next build`: no client (see shouldSkipDbDuringBuild) — no connection spam.
       * Runtime: lazy TCP connect; allow queue until ready — `enableOfflineQueue: false` caused
       * "Stream isn't writeable" on first rate-limit / cache commands with ioredis.
       */
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: true,
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
