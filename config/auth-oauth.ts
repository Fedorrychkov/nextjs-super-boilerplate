import { NEXT_PUBLIC_SITE_URL } from './env'

export const OAUTH_PROVIDER_IDS = ['yandex', 'google', 'github', 'apple', 'vk', 'telegram', 'microsoft', 'discord'] as const

export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number]

export type AuthUiMode = 'credentials_first' | 'oauth_first' | 'credentials_only' | 'oauth_only'

export type OAuthProviderContext = 'signIn' | 'signUp' | 'link'

function parseBool(value: string | undefined): boolean {
  if (!value?.trim()) return false
  const n = value.trim().toLowerCase()

  return n === '1' || n === 'true' || n === 'yes' || n === 'on'
}

function parseProviderList(raw: string | undefined): OAuthProviderId[] {
  if (!raw?.trim()) return []

  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((id): id is OAuthProviderId => (OAUTH_PROVIDER_IDS as readonly string[]).includes(id))
}

function parseAuthUiMode(raw: string | undefined): AuthUiMode {
  const v = raw?.trim().toLowerCase()

  if (v === 'oauth_first' || v === 'credentials_only' || v === 'oauth_only') {
    return v
  }

  return 'credentials_first'
}

function isProviderEnabled(id: OAuthProviderId): boolean {
  const key = `AUTH_OAUTH_${id.toUpperCase()}_ENABLED`

  return parseBool(process.env[key])
}

function getProviderClientId(id: OAuthProviderId): string {
  const map: Record<OAuthProviderId, string> = {
    yandex: process.env.YANDEX_OAUTH_CLIENT_ID ?? '',
    google: process.env.GOOGLE_OAUTH_CLIENT_ID ?? '',
    github: process.env.GITHUB_OAUTH_CLIENT_ID ?? '',
    apple: process.env.APPLE_OAUTH_CLIENT_ID ?? '',
    vk: process.env.VK_OAUTH_CLIENT_ID ?? '',
    telegram: process.env.TELEGRAM_BOT_USERNAME ?? '',
    microsoft: process.env.MICROSOFT_OAUTH_CLIENT_ID ?? '',
    discord: process.env.DISCORD_OAUTH_CLIENT_ID ?? '',
  }

  return map[id]?.trim() ?? ''
}

function getProviderClientSecret(id: OAuthProviderId): string {
  const map: Record<OAuthProviderId, string> = {
    yandex: process.env.YANDEX_OAUTH_CLIENT_SECRET ?? '',
    google: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? '',
    github: process.env.GITHUB_OAUTH_CLIENT_SECRET ?? '',
    apple: process.env.APPLE_OAUTH_PRIVATE_KEY ?? '',
    vk: process.env.VK_OAUTH_CLIENT_SECRET ?? '',
    telegram: process.env.TELEGRAM_BOT_TOKEN ?? '',
    microsoft: process.env.MICROSOFT_OAUTH_CLIENT_SECRET ?? '',
    discord: process.env.DISCORD_OAUTH_CLIENT_SECRET ?? '',
  }

  return map[id]?.trim() ?? ''
}

const siteBase = () => NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')

export function getOAuthCallbackUrl(provider: OAuthProviderId, intent: 'auth' | 'link'): string {
  const suffix = intent === 'link' ? 'link/callback' : 'callback'

  return `${siteBase()}/api/v1/auth/oauth/${provider}/${suffix}`
}

export const OAUTH_CONFIG = {
  uiMode: parseAuthUiMode(process.env.AUTH_UI_MODE ?? process.env.NEXT_PUBLIC_AUTH_UI_MODE),
  publicUiMode: parseAuthUiMode(process.env.NEXT_PUBLIC_AUTH_UI_MODE ?? process.env.AUTH_UI_MODE),
  signInProviders: parseProviderList(process.env.AUTH_OAUTH_SIGN_IN_PROVIDERS ?? process.env.NEXT_PUBLIC_AUTH_OAUTH_SIGN_IN_PROVIDERS),
  signUpProviders: parseProviderList(process.env.AUTH_OAUTH_SIGN_UP_PROVIDERS ?? process.env.NEXT_PUBLIC_AUTH_OAUTH_SIGN_UP_PROVIDERS),
  linkProviders: parseProviderList(process.env.AUTH_OAUTH_LINK_PROVIDERS ?? process.env.NEXT_PUBLIC_AUTH_OAUTH_LINK_PROVIDERS),
  publicSignInProviders: parseProviderList(process.env.NEXT_PUBLIC_AUTH_OAUTH_SIGN_IN_PROVIDERS ?? process.env.AUTH_OAUTH_SIGN_IN_PROVIDERS),
  publicSignUpProviders: parseProviderList(process.env.NEXT_PUBLIC_AUTH_OAUTH_SIGN_UP_PROVIDERS ?? process.env.AUTH_OAUTH_SIGN_UP_PROVIDERS),
  publicLinkProviders: parseProviderList(process.env.NEXT_PUBLIC_AUTH_OAUTH_LINK_PROVIDERS ?? process.env.AUTH_OAUTH_LINK_PROVIDERS),
  isProviderEnabled,
  getProviderClientId,
  getProviderClientSecret,
  isProviderConfigured(id: OAuthProviderId): boolean {
    return isProviderEnabled(id) && Boolean(getProviderClientId(id)) && Boolean(getProviderClientSecret(id))
  },
  getProvidersForContext(context: OAuthProviderContext): OAuthProviderId[] {
    const list = context === 'signIn' ? OAUTH_CONFIG.signInProviders : context === 'signUp' ? OAUTH_CONFIG.signUpProviders : OAUTH_CONFIG.linkProviders

    return list.filter((id) => OAUTH_CONFIG.isProviderConfigured(id))
  },
  getPublicProvidersForContext(context: OAuthProviderContext): OAuthProviderId[] {
    const list =
      context === 'signIn' ? OAUTH_CONFIG.publicSignInProviders : context === 'signUp' ? OAUTH_CONFIG.publicSignUpProviders : OAUTH_CONFIG.publicLinkProviders

    return list.filter((id) => OAUTH_CONFIG.isProviderConfigured(id))
  },
}
