import { OAUTH_CONFIG } from '@config/auth-oauth'

import { getJson, postForm } from '../oauth-http'
import type { OAuthProviderAdapter, OAuthTokenSet } from '../types'

type GitHubTokenResponse = {
  access_token: string
  token_type?: string
  scope?: string
}

type GitHubUser = {
  id: number
  login: string
  email?: string | null
  name?: string | null
  avatar_url?: string | null
}

type GitHubEmail = {
  email: string
  primary: boolean
  verified: boolean
  visibility?: string | null
}

export const githubOAuthProvider: OAuthProviderAdapter = {
  id: 'github',
  displayName: 'GitHub',
  usesPkce: false,
  singleRedirectUri: true,
  defaultSignInScopes: ['read:user', 'user:email'],
  defaultLinkScopes: ['read:user', 'user:email'],

  getAuthorizationUrl({ redirectUri, state, scopes }) {
    const params = new URLSearchParams({
      client_id: OAUTH_CONFIG.getProviderClientId('github'),
      redirect_uri: redirectUri,
      state,
      scope: scopes.join(' '),
      allow_signup: 'true',
    })

    return `https://github.com/login/oauth/authorize?${params.toString()}`
  },

  async exchangeCode({ code, redirectUri }) {
    const data = await postForm<GitHubTokenResponse>(
      'https://github.com/login/oauth/access_token',
      {
        client_id: OAUTH_CONFIG.getProviderClientId('github'),
        client_secret: OAUTH_CONFIG.getProviderClientSecret('github'),
        code,
        redirect_uri: redirectUri,
      },
      { Accept: 'application/json' },
    )

    return {
      accessToken: data.access_token,
      tokenType: data.token_type ?? null,
      scope: data.scope ?? null,
    }
  },

  async getProfile(tokens: OAuthTokenSet) {
    const user = await getJson<GitHubUser>('https://api.github.com/user', {
      Authorization: `Bearer ${tokens.accessToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'nextjs-super-boilerplate',
    })

    let email = user.email?.toLowerCase() ?? null
    let emailVerified = Boolean(email)

    if (!email) {
      const emails = await getJson<GitHubEmail[]>('https://api.github.com/user/emails', {
        Authorization: `Bearer ${tokens.accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'nextjs-super-boilerplate',
      })

      const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified)

      email = primary?.email?.toLowerCase() ?? null
      emailVerified = Boolean(primary?.verified)
    }

    return {
      providerUserId: String(user.id),
      email,
      emailVerified,
      name: user.name ?? null,
      avatarUrl: user.avatar_url ?? null,
      login: user.login,
    }
  },
}
