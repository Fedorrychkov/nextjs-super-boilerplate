import { cacheClient } from '@lib/cache'

import { getUniqueId } from '~/utils/getUniqueId'
import { jsonStringifySafety } from '~/utils/jsonSafe'

const CHALLENGE_TTL_SECONDS = 5 * 60 // 5 minutes

const buildChallengeKey = (id: string) => `auth:login:challenge:${id}`

export type LoginChallenge = {
  userId: string
}

export const createLoginChallenge = async (userId: string): Promise<string> => {
  const id = getUniqueId()
  const key = buildChallengeKey(id)

  const payload: LoginChallenge = { userId }

  await cacheClient.set(key, jsonStringifySafety(payload) ?? '', CHALLENGE_TTL_SECONDS)

  return id
}

export const consumeLoginChallenge = async (id: string): Promise<LoginChallenge | null> => {
  const key = buildChallengeKey(id)
  const data = await cacheClient.get(key)

  if (!data) {
    return null
  }

  try {
    return JSON.parse(data) as LoginChallenge
  } catch {
    return null
  }
}
