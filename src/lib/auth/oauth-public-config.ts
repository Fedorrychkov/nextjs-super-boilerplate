import type { AuthUiMode, OAuthProviderId } from '@config/auth-oauth'
import { OAUTH_PROVIDER_IDS } from '@config/auth-oauth'

function parseProviderList(raw: string | undefined): OAuthProviderId[] {
  if (!raw?.trim()) return []

  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((id): id is OAuthProviderId => (OAUTH_PROVIDER_IDS as readonly string[]).includes(id))
}

export type PublicOAuthConfig = {
  uiMode: AuthUiMode
  signInProviders: OAuthProviderId[]
  signUpProviders: OAuthProviderId[]
  linkProviders: OAuthProviderId[]
}

export function getPublicOAuthConfig(): PublicOAuthConfig {
  return {
    uiMode: (process.env.NEXT_PUBLIC_AUTH_UI_MODE?.trim() as AuthUiMode) || 'credentials_first',
    signInProviders: parseProviderList(process.env.NEXT_PUBLIC_AUTH_OAUTH_SIGN_IN_PROVIDERS),
    signUpProviders: parseProviderList(process.env.NEXT_PUBLIC_AUTH_OAUTH_SIGN_UP_PROVIDERS),
    linkProviders: parseProviderList(process.env.NEXT_PUBLIC_AUTH_OAUTH_LINK_PROVIDERS),
  }
}

export const OAUTH_PROVIDER_LABELS: Record<OAuthProviderId, string> = {
  yandex: 'Yandex',
  google: 'Google',
  github: 'GitHub',
  apple: 'Apple',
  vk: 'VK',
  telegram: 'Telegram',
  microsoft: 'Microsoft',
  discord: 'Discord',
}
