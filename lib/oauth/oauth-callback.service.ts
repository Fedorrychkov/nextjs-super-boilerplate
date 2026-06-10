import { NEXT_PUBLIC_SITE_URL } from '@config/env'
import { setAuthCookies } from '@lib/cookies'
import { ValidationError } from '@lib/error/custom-errors'
import { notifyNewLogin } from '@lib/services/security-notification.service'
import type { RequestClientMeta } from '@lib/utils/request-client-meta'
import { NextResponse } from 'next/server'

import type { OAuthProviderId } from '~/api/oauth'
import type { TFunction } from '~/lib/i18n'

import { handleOAuthAuthCallback, handleOAuthLinkCallback } from './oauth-flow.service'
import { buildOAuthLoginRedirect, buildProfileRedirect } from './oauth-redirect'
import { resolveOAuthRedirectUri } from './oauth-redirect-uri'
import { consumeOAuthState } from './oauth-state'
import { resolveOAuthProvider } from './registry'

export async function processOAuthCallback(params: {
  provider: OAuthProviderId
  code: string | null
  state: string | null
  deviceId?: string | null
  error: string | null
  intent: 'auth' | 'link'
  clientMeta?: RequestClientMeta | null
  languageCode?: string | null
  t: TFunction
  ip?: string | null
  userAgent?: string | null
}): Promise<NextResponse> {
  if (params.error) {
    const url =
      params.intent === 'link'
        ? buildProfileRedirect({ oauthError: 'oauth_provider_error' })
        : buildOAuthLoginRedirect({ oauthError: 'oauth_provider_error', variant: 'sign-in' })

    return NextResponse.redirect(url)
  }

  if (!params.code || !params.state) {
    throw new ValidationError(params.t('auth.oauth.errors.invalidCallback'))
  }

  const stored = await consumeOAuthState(params.state)

  if (!stored || stored.provider !== params.provider) {
    throw new ValidationError(params.t('auth.oauth.errors.stateExpired'))
  }

  const adapter = resolveOAuthProvider(params.provider)
  const redirectIntent = stored.flow === 'link' ? 'link' : 'auth'
  const redirectUri = resolveOAuthRedirectUri(params.provider, redirectIntent)

  const tokens = await adapter.exchangeCode({
    code: params.code,
    redirectUri,
    codeVerifier: stored.codeVerifier,
    deviceId: params.deviceId ?? undefined,
    state: params.state ?? undefined,
  })

  const profile = await adapter.getProfile(tokens)
  const scopes = tokens.scope?.split(/[\s,]+/).filter(Boolean) ?? adapter.defaultSignInScopes

  if (stored.flow === 'link' || params.intent === 'link') {
    const { url } = await handleOAuthLinkCallback({
      flow: 'link',
      provider: params.provider,
      profile,
      tokens,
      scopes,
      actorUserId: stored.userId ?? null,
      ip: params.ip,
      userAgent: params.userAgent,
      t: params.t,
    })

    return NextResponse.redirect(url)
  }

  const result = await handleOAuthAuthCallback({
    flow: stored.flow,
    provider: params.provider,
    profile,
    tokens,
    scopes,
    clientMeta: params.clientMeta,
    languageCode: params.languageCode,
    nextPath: stored.nextPath,
    ip: params.ip,
    userAgent: params.userAgent,
    t: params.t,
  })

  if (result.kind === 'redirect') {
    return NextResponse.redirect(result.url)
  }

  const nextPath = stored.nextPath?.startsWith('/') ? stored.nextPath : '/'
  const siteBase = NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '') || 'http://localhost:3000'
  const siteRedirect = NextResponse.redirect(new URL(nextPath, siteBase))

  setAuthCookies(siteRedirect, result.auth.accessToken, result.auth.refreshToken, result.auth.expiresIn)

  void notifyNewLogin({
    recipientUserId: result.auth.user.id,
    t: params.t,
    client: params.clientMeta ?? { ip: params.ip ?? null, userAgent: params.userAgent ?? null },
  })

  return siteRedirect
}
