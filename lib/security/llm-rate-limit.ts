import { LLM_CONFIG } from '@config/env'
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible'

import { redisClient } from '../redis'

class LlmChatRateLimit {
  private readonly limiter: RateLimiterMemory | RateLimiterRedis

  constructor() {
    const redis = redisClient.client
    const points = Number(LLM_CONFIG.chatRateLimitPoints) || 30
    const duration = Number(LLM_CONFIG.chatRateDurationSec) || 60

    if (!redis) {
      this.limiter = new RateLimiterMemory({
        points,
        duration,
      })
    } else {
      this.limiter = new RateLimiterRedis({
        storeClient: redis,
        points,
        duration,
        keyPrefix: 'rl_llm_chat',
      })
    }
  }

  get limit() {
    return this.limiter
  }
}

export const llmChatRateLimit = new LlmChatRateLimit().limit
