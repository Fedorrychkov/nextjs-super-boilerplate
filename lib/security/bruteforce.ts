import { cacheClient } from '@lib/cache'
import { BruteForceError } from '@lib/error/custom-errors'

import { logger } from '~/utils/logger'

const LOGIN_MAX_ATTEMPTS = 3
const LOGIN_WINDOW_SECONDS = 15 * 60

const REGISTER_MAX_ATTEMPTS = 5
const REGISTER_WINDOW_SECONDS = 5 * 60

const buildLoginIpKey = (ip: string) => `auth:login:ip:${ip}`
const buildLoginEmailKey = (email: string) => `auth:login:email:${email.toLowerCase()}`

const buildRegisterIpKey = (ip: string) => `auth:register:ip:${ip}`

export const ensureCanRegister = async (ip?: string | null) => {
  if (!ip) return

  const key = buildRegisterIpKey(ip)
  const attempts = await cacheClient.incr(key, REGISTER_WINDOW_SECONDS)
  const ttl = await cacheClient.ttl(key)

  logger.warn('[bruteforce] registration attempts', { ip, attempts, ttl })

  if (attempts > REGISTER_MAX_ATTEMPTS) {
    throw new BruteForceError('Too many registration attempts. Please try again later.', ttl ?? REGISTER_WINDOW_SECONDS)
  }
}

export const assertLoginNotBlocked = async (ip: string | null | undefined, email: string) => {
  const keys: string[] = []

  if (ip) {
    keys.push(buildLoginIpKey(ip))
  }

  if (email) {
    keys.push(buildLoginEmailKey(email))
  }

  let maxTtl: number | null = null

  for (const key of keys) {
    const value = await cacheClient.get(key)
    const attempts = value ? Number(value) : 0
    const ttl = await cacheClient.ttl(key)

    if (ttl && (maxTtl === null || ttl > maxTtl)) {
      maxTtl = ttl
    }

    if (attempts >= LOGIN_MAX_ATTEMPTS) {
      logger.warn('[bruteforce] login blocked', { key, attempts, ttl })

      throw new BruteForceError('Too many login attempts. Please try again later.', maxTtl ?? LOGIN_WINDOW_SECONDS)
    }
  }
}

export const recordLoginFailure = async (ip: string | null | undefined, email: string) => {
  const keys: string[] = []

  if (ip) {
    keys.push(buildLoginIpKey(ip))
  }

  if (email) {
    keys.push(buildLoginEmailKey(email))
  }

  await Promise.all(
    keys.map(async (key) => {
      const attempts = await cacheClient.incr(key, LOGIN_WINDOW_SECONDS)
      const ttl = await cacheClient.ttl(key)

      logger.warn('[bruteforce] login attempts', { key, attempts, ttl })
    }),
  )
}
