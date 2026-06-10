import type { OAuthProviderId } from '@config/auth-oauth'
import { OAUTH_CONFIG } from '@config/auth-oauth'
import { ValidationError } from '@lib/error/custom-errors'

import { discordOAuthProvider } from './providers/discord.provider'
import { githubOAuthProvider } from './providers/github.provider'
import { googleOAuthProvider } from './providers/google.provider'
import { vkOAuthProvider } from './providers/vk.provider'
import { yandexOAuthProvider } from './providers/yandex.provider'
import type { OAuthProviderAdapter } from './types'

const ADAPTERS: Record<OAuthProviderId, OAuthProviderAdapter | null> = {
  yandex: yandexOAuthProvider,
  google: googleOAuthProvider,
  github: githubOAuthProvider,
  apple: null,
  vk: vkOAuthProvider,
  telegram: null,
  microsoft: null,
  discord: discordOAuthProvider,
}

export function resolveOAuthProvider(id: string): OAuthProviderAdapter {
  const providerId = id.toLowerCase() as OAuthProviderId

  if (!OAUTH_CONFIG.isProviderConfigured(providerId)) {
    throw new ValidationError(`OAuth provider "${id}" is not configured`)
  }

  const adapter = ADAPTERS[providerId]

  if (!adapter) {
    throw new ValidationError(`OAuth provider "${id}" is not implemented yet`)
  }

  return adapter
}

export function isKnownOAuthProvider(id: string): id is OAuthProviderId {
  return (Object.keys(ADAPTERS) as OAuthProviderId[]).includes(id.toLowerCase() as OAuthProviderId)
}
