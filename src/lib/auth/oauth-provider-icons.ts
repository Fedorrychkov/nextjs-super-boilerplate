import type { OAuthProviderId } from '@config/auth-oauth'

/** Local brand icons in /public/oauth (Simple Icons–based SVGs). */
export const OAUTH_PROVIDER_ICON_SRC: Partial<Record<OAuthProviderId, string>> = {
  yandex: '/oauth/yandex.svg',
  google: '/oauth/google.svg',
  github: '/oauth/github.svg',
  discord: '/oauth/discord.svg',
  vk: '/oauth/vk.svg',
}

export function getOAuthProviderIconSrc(provider: OAuthProviderId): string | null {
  return OAUTH_PROVIDER_ICON_SRC[provider] ?? null
}
