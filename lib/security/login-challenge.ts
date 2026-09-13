import { cacheClient } from '@lib/cache'

import { getUniqueId } from '~/utils/getUniqueId'
import { jsonParseSafety, jsonStringifySafety } from '~/utils/jsonSafe'

import { LOGIN_CHALLENGE_TTL_SECONDS, type LoginChallenge, nextChallengeAfterFailure } from './login-challenge-policy'

export type { LoginChallenge } from './login-challenge-policy'

const buildChallengeKey = (id: string) => `auth:login:challenge:${id}`

export const createLoginChallenge = async (userId: string): Promise<string> => {
  const id = getUniqueId()
  const payload: LoginChallenge = { userId, attempts: 0 }

  await cacheClient.set(buildChallengeKey(id), jsonStringifySafety(payload) ?? '', LOGIN_CHALLENGE_TTL_SECONDS)

  return id
}

/**
 * Takes the challenge OUT of the cache. The old `consume` only read it, so one id — obtained
 * after a correct password — stayed valid for the whole TTL and the TOTP code could be guessed
 * against it. Now a used id cannot be replayed by construction; a wrong code puts the challenge
 * back with the attempt counted (`returnChallengeAfterFailure`).
 */
export const takeLoginChallenge = async (id: string): Promise<LoginChallenge | null> => {
  const data = await cacheClient.take(buildChallengeKey(id))

  if (!data) {
    return null
  }

  const parsed = jsonParseSafety<Partial<LoginChallenge>>(data)

  if (!parsed?.userId) {
    return null
  }

  // A challenge written before the counter existed has no `attempts`; it starts at zero.
  return { userId: parsed.userId, attempts: parsed.attempts ?? 0 }
}

/** After a wrong code: the challenge goes back with +1, or dies once the limit is reached. */
export const returnChallengeAfterFailure = async (id: string, challenge: LoginChallenge): Promise<{ dead: boolean }> => {
  const next = nextChallengeAfterFailure(challenge)

  if (!next) {
    return { dead: true }
  }

  await cacheClient.set(buildChallengeKey(id), jsonStringifySafety(next) ?? '', LOGIN_CHALLENGE_TTL_SECONDS)

  return { dead: false }
}
