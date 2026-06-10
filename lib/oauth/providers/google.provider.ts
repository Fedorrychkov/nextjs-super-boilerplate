import { OAUTH_CONFIG } from '@config/auth-oauth'

import { getJson, postForm } from '../oauth-http'
import type { OAuthProviderAdapter, OAuthTokenSet } from '../types'

type GoogleTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}

type GoogleProfile = {
  sub: string
  email?: string
  email_verified?: boolean
  name?: string
  picture?: string
}

export const googleOAuthProvider: OAuthProviderAdapter = {
  id: 'google',
  displayName: 'Google',
  usesPkce: true,
  defaultSignInScopes: ['openid', 'email', 'profile'],
  defaultLinkScopes: ['openid', 'email', 'profile'],

  getAuthorizationUrl({ redirectUri, state, scopes, codeChallenge }) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: OAUTH_CONFIG.getProviderClientId('google'),
      redirect_uri: redirectUri,
      state,
      scope: scopes.join(' '),
      access_type: 'online',
      prompt: 'select_account',
    })

    if (codeChallenge) {
      params.set('code_challenge', codeChallenge)
      params.set('code_challenge_method', 'S256')
    }

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  },

  async exchangeCode({ code, redirectUri, codeVerifier }) {
    const body: Record<string, string> = {
      grant_type: 'authorization_code',
      code,
      client_id: OAUTH_CONFIG.getProviderClientId('google'),
      client_secret: OAUTH_CONFIG.getProviderClientSecret('google'),
      redirect_uri: redirectUri,
    }

    if (codeVerifier) {
      body.code_verifier = codeVerifier
    }

    const data = await postForm<GoogleTokenResponse>('https://oauth2.googleapis.com/token', body)

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? null,
      expiresIn: data.expires_in ?? null,
      tokenType: data.token_type ?? null,
      scope: data.scope ?? null,
    }
  },

  async getProfile(tokens: OAuthTokenSet) {
    const profile = await getJson<GoogleProfile>('https://www.googleapis.com/oauth2/v3/userinfo', {
      Authorization: `Bearer ${tokens.accessToken}`,
    })

    return {
      providerUserId: profile.sub,
      email: profile.email?.toLowerCase() ?? null,
      emailVerified: profile.email_verified ?? false,
      name: profile.name ?? null,
      avatarUrl: profile.picture ?? null,
    }
  },
}
