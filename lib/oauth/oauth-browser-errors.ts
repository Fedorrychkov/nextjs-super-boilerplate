import { NEXT_PUBLIC_SITE_URL } from '@config/env'
import { BruteForceError, ValidationError } from '@lib/error/custom-errors'

import type { TFunction } from '~/lib/i18n'

export type OAuthBrowserIntent = 'auth' | 'link'

export type OAuthBrowserErrorCode =
  | 'oauth_unknown'
  | 'oauth_invalid_callback'
  | 'oauth_state_expired'
  | 'oauth_link_session_expired'
  | 'oauth_user_inactive'
  | 'oauth_provider_error'
  | 'oauth_unknown_provider'
  | 'oauth_rate_limited'
  | 'oauth_provider_not_configured'
  | 'oauth_phone_taken'

const OAUTH_BROWSER_ERROR_CODES = new Set<OAuthBrowserErrorCode>([
  'oauth_unknown',
  'oauth_invalid_callback',
  'oauth_state_expired',
  'oauth_link_session_expired',
  'oauth_user_inactive',
  'oauth_provider_error',
  'oauth_unknown_provider',
  'oauth_rate_limited',
  'oauth_provider_not_configured',
  'oauth_phone_taken',
])

export function isOAuthBrowserErrorCode(value: string): value is OAuthBrowserErrorCode {
  return OAUTH_BROWSER_ERROR_CODES.has(value as OAuthBrowserErrorCode)
}

export function buildOAuthErrorPageUrl(params: { intent: OAuthBrowserIntent; code: OAuthBrowserErrorCode; retryAfterSec?: number }): string {
  const siteBase = NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '') || 'http://localhost:3000'
  const url = new URL('/auth/oauth/error', siteBase)

  url.searchParams.set('intent', params.intent)
  url.searchParams.set('code', params.code)

  if (params.retryAfterSec && params.retryAfterSec > 0) {
    url.searchParams.set('retryAfter', String(Math.ceil(params.retryAfterSec)))
  }

  return url.toString()
}

export function resolveOAuthBrowserErrorCode(
  error: unknown,
  t: TFunction,
): {
  code: OAuthBrowserErrorCode
  retryAfterSec?: number
} {
  if (error instanceof BruteForceError) {
    return { code: 'oauth_rate_limited', retryAfterSec: error.retryAfterSeconds }
  }

  if (error instanceof ValidationError) {
    const detailsCode = error.details?.code

    if (typeof detailsCode === 'string' && isOAuthBrowserErrorCode(detailsCode)) {
      return { code: detailsCode }
    }

    const messageMap: Array<[string, OAuthBrowserErrorCode]> = [
      [t('auth.oauth.errors.invalidCallback'), 'oauth_invalid_callback'],
      [t('auth.oauth.errors.stateExpired'), 'oauth_state_expired'],
      [t('auth.oauth.errors.linkSessionExpired'), 'oauth_link_session_expired'],
      [t('auth.oauth.errors.unknownProvider'), 'oauth_unknown_provider'],
    ]

    for (const [pattern, code] of messageMap) {
      if (error.message === pattern) {
        return { code }
      }
    }

    if (/not implemented/i.test(error.message)) {
      return { code: 'oauth_unknown_provider' }
    }

    if (/not configured|not enabled/i.test(error.message)) {
      return { code: 'oauth_provider_not_configured' }
    }

    if (error.message === 'User not found or inactive') {
      return { code: 'oauth_user_inactive' }
    }
  }

  if (error instanceof Error) {
    if (error.message.includes('OAuth token exchange failed') || error.message.includes('OAuth profile request failed')) {
      return { code: 'oauth_provider_error' }
    }
  }

  return { code: 'oauth_unknown' }
}
