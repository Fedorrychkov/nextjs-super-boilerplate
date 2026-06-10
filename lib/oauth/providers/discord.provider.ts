import { OAUTH_CONFIG } from '@config/auth-oauth'

import { getJson, postForm } from '../oauth-http'
import type { OAuthProviderAdapter, OAuthTokenSet } from '../types'

type DiscordTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}

type DiscordUser = {
  id: string
  username: string
  global_name?: string | null
  email?: string | null
  verified?: boolean
  avatar?: string | null
}

function discordAvatarUrl(user: DiscordUser): string | null {
  if (!user.avatar) {
    return null
  }

  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
}

export const discordOAuthProvider: OAuthProviderAdapter = {
  id: 'discord',
  displayName: 'Discord',
  usesPkce: false,
  defaultSignInScopes: ['identify', 'email'],
  defaultLinkScopes: ['identify', 'email'],

  getAuthorizationUrl({ redirectUri, state, scopes }) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: OAUTH_CONFIG.getProviderClientId('discord'),
      redirect_uri: redirectUri,
      state,
      scope: scopes.join(' '),
      prompt: 'consent',
    })

    return `https://discord.com/oauth2/authorize?${params.toString()}`
  },

  async exchangeCode({ code, redirectUri }) {
    const clientId = OAUTH_CONFIG.getProviderClientId('discord')
    const clientSecret = OAUTH_CONFIG.getProviderClientSecret('discord')

    const data = await postForm<DiscordTokenResponse>(
      'https://discord.com/api/oauth2/token',
      {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      },
      undefined,
      { username: clientId, password: clientSecret },
    )

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresIn: data.expires_in ?? null,
      tokenType: data.token_type ?? null,
      scope: data.scope ?? null,
    }
  },

  async getProfile(tokens: OAuthTokenSet) {
    const user = await getJson<DiscordUser>('https://discord.com/api/users/@me', {
      Authorization: `Bearer ${tokens.accessToken}`,
    })

    return {
      providerUserId: user.id,
      email: user.email?.toLowerCase() ?? null,
      emailVerified: user.verified ?? Boolean(user.email),
      name: user.global_name ?? user.username ?? null,
      avatarUrl: discordAvatarUrl(user),
      login: user.username,
    }
  },
}
