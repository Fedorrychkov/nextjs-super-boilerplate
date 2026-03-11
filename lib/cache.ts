import type Redis from 'ioredis'

import { redisClient } from './redis'

type CacheValue = string

export interface CacheClient {
  get(key: string): Promise<CacheValue | null>
  set(key: string, value: CacheValue, ttlSeconds?: number): Promise<void>
  incr(key: string, ttlSeconds?: number): Promise<number>
  del(key: string): Promise<void>
  ttl(key: string): Promise<number | null>
}

type InMemoryEntry = {
  value: CacheValue
  expiresAt?: number
}

class InMemoryCacheClient implements CacheClient {
  private store = new Map<string, InMemoryEntry>()

  async get(key: string): Promise<CacheValue | null> {
    const entry = this.store.get(key)

    if (!entry) return null

    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.store.delete(key)

      return null
    }

    return entry.value
  }

  async set(key: string, value: CacheValue, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined

    this.store.set(key, { value, expiresAt })
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const current = await this.get(key)
    const next = current ? Number(current) + 1 : 1

    await this.set(key, String(next), ttlSeconds)

    return next
  }

  async del(key: string): Promise<void> {
    this.store.delete(key)
  }

  async ttl(key: string): Promise<number | null> {
    const entry = this.store.get(key)

    if (!entry || !entry.expiresAt) return null

    const diff = entry.expiresAt - Date.now()

    if (diff <= 0) {
      this.store.delete(key)

      return null
    }

    return Math.ceil(diff / 1000)
  }
}

class RedisCacheClient implements CacheClient {
  private client: Redis

  constructor(client: Redis) {
    this.client = client
  }

  async get(key: string): Promise<CacheValue | null> {
    const value = await this.client.get(key)

    return value ?? null
  }

  async set(key: string, value: CacheValue, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds)
    } else {
      await this.client.set(key, value)
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const exists = await this.client.exists(key)
    const value = await this.client.incr(key)

    if (!exists && ttlSeconds) {
      await this.client.expire(key, ttlSeconds)
    }

    return value
  }

  async del(key: string): Promise<void> {
    await this.client.del(key)
  }

  async ttl(key: string): Promise<number | null> {
    const ttl = await this.client.ttl(key)

    if (ttl < 0) {
      return null
    }

    return ttl
  }
}

const redis = redisClient.client

export const cacheClient: CacheClient = redis ? new RedisCacheClient(redis) : new InMemoryCacheClient()
