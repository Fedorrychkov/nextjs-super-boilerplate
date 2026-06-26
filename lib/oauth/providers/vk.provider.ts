import { OAUTH_CONFIG } from '@config/auth-oauth'

import { postForm } from '../oauth-http'
import type { OAuthProviderAdapter, OAuthTokenSet } from '../types'

type VkTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
  user_id?: number | string
}

type VkUserInfoResponse = {
  user?: {
    user_id?: string | number
    first_name?: string
    last_name?: string
    email?: string
    avatar?: string
  }
}

export const vkOAuthProvider: OAuthProviderAdapter = {
  id: 'vk',
  displayName: 'VK ID',
  usesPkce: true,
  defaultSignInScopes: ['email'],
  defaultLinkScopes: ['email'],

  getAuthorizationUrl({ redirectUri, state, scopes, codeChallenge }) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: OAUTH_CONFIG.getProviderClientId('vk'),
      redirect_uri: redirectUri,
      state,
      scope: scopes.join(' '),
    })

    if (codeChallenge) {
      params.set('code_challenge', codeChallenge)
      params.set('code_challenge_method', 'S256')
    }

    return `https://id.vk.ru/authorize?${params.toString()}`
  },

  async exchangeCode({ code, redirectUri, codeVerifier, deviceId, state }) {
    if (!codeVerifier) {
      throw new Error('VK ID requires PKCE code_verifier')
    }

    if (!deviceId) {
      throw new Error('VK ID requires device_id from callback')
    }

    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: OAUTH_CONFIG.getProviderClientId('vk'),
      code_verifier: codeVerifier,
      device_id: deviceId,
    }

    const clientSecret = OAUTH_CONFIG.getProviderClientSecret('vk')

    if (clientSecret) {
      body.client_secret = clientSecret
    }

    if (state) {
      body.state = state
    }

    const data = await postForm<VkTokenResponse>('https://id.vk.ru/oauth2/auth', body)

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresIn: data.expires_in ?? null,
      tokenType: data.token_type ?? null,
      scope: data.scope ?? null,
    }
  },

  async getProfile(tokens: OAuthTokenSet) {
    const data = await postForm<VkUserInfoResponse>('https://id.vk.ru/oauth2/user_info', {
      client_id: OAUTH_CONFIG.getProviderClientId('vk'),
      access_token: tokens.accessToken,
    })

    const user = data.user

    if (!user?.user_id) {
      throw new Error('VK ID user_info missing user_id')
    }

    const firstName = user.first_name?.trim() ?? ''
    const lastName = user.last_name?.trim() ?? ''
    const name = [firstName, lastName].filter(Boolean).join(' ') || null
    const email = user.email?.toLowerCase() ?? null

    return {
      providerUserId: String(user.user_id),
      email,
      emailVerified: Boolean(email),
      name,
      avatarUrl: user.avatar ?? null,
      login: null,
    }
  },
}
