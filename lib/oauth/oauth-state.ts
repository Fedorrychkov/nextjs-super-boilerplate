import { cacheClient } from '@lib/cache'

import type { OAuthFlow, OAuthProviderId } from '~/api/oauth'
import { getUniqueId } from '~/utils/getUniqueId'
import { jsonParseSafety, jsonStringifySafety } from '~/utils/jsonSafe'

const OAUTH_STATE_TTL_SECONDS = 10 * 60

const buildOAuthStateKey = (id: string) => `auth:oauth:state:${id}`

export type OAuthStatePayload = {
  provider: OAuthProviderId
  flow: OAuthFlow
  codeVerifier?: string
  userId?: string
  nextPath?: string
}

export async function createOAuthState(payload: OAuthStatePayload): Promise<string> {
  const id = getUniqueId()
  const key = buildOAuthStateKey(id)

  await cacheClient.set(key, jsonStringifySafety(payload) ?? '', OAUTH_STATE_TTL_SECONDS)

  return id
}

export async function consumeOAuthState(id: string): Promise<OAuthStatePayload | null> {
  const key = buildOAuthStateKey(id)
  const data = await cacheClient.get(key)

  if (!data) {
    return null
  }

  await cacheClient.del(key)

  return jsonParseSafety<OAuthStatePayload>(data) ?? null
}
