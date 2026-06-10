import { OAUTH_CONFIG } from '@config/auth-oauth'

import { getJson, postForm } from '../oauth-http'
import type { OAuthProviderAdapter, OAuthTokenSet } from '../types'

type YandexTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
}

type YandexProfile = {
  id: string
  login?: string
  default_email?: string
  emails?: string[]
}

export const yandexOAuthProvider: OAuthProviderAdapter = {
  id: 'yandex',
  displayName: 'Yandex',
  usesPkce: false,
  defaultSignInScopes: ['login:email'],
  defaultLinkScopes: ['login:email'],

  getAuthorizationUrl({ redirectUri, state, scopes }) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: OAUTH_CONFIG.getProviderClientId('yandex'),
      redirect_uri: redirectUri,
      state,
    })

    if (scopes.length) {
      params.set('scope', scopes.join(' '))
    }

    return `https://oauth.yandex.ru/authorize?${params.toString()}`
  },

  async exchangeCode({ code }) {
    const data = await postForm<YandexTokenResponse>('https://oauth.yandex.ru/token', {
      grant_type: 'authorization_code',
      code,
      client_id: OAUTH_CONFIG.getProviderClientId('yandex'),
      client_secret: OAUTH_CONFIG.getProviderClientSecret('yandex'),
    })

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresIn: data.expires_in ?? null,
      tokenType: data.token_type ?? null,
    }
  },

  async getProfile(tokens: OAuthTokenSet) {
    const profile = await getJson<YandexProfile>('https://login.yandex.ru/info?format=json', {
      Authorization: `OAuth ${tokens.accessToken}`,
    })

    const email = profile.default_email ?? profile.emails?.[0] ?? null

    return {
      providerUserId: String(profile.id),
      email: email?.toLowerCase() ?? null,
      emailVerified: Boolean(email),
      login: profile.login ?? null,
    }
  },
}
