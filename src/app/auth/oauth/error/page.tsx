'use client'

import { isOAuthBrowserErrorCode, type OAuthBrowserErrorCode } from '@lib/oauth/oauth-browser-errors'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

import { SpinnerScreen } from '~/components/Loaders'
import { Button, Typography } from '~/components/ui'
import type { AppMessageKey } from '~/lib/i18n/types'
import { useT } from '~/providers'

const ERROR_MESSAGE_KEYS: Record<OAuthBrowserErrorCode, AppMessageKey> = {
  oauth_unknown: 'auth.oauth.errors.unknown',
  oauth_invalid_callback: 'auth.oauth.errors.invalidCallback',
  oauth_state_expired: 'auth.oauth.errors.stateExpired',
  oauth_link_session_expired: 'auth.oauth.errors.linkSessionExpired',
  oauth_user_inactive: 'auth.oauth.errorPage.userInactive',
  oauth_provider_error: 'auth.oauth.errors.providerError',
  oauth_unknown_provider: 'auth.oauth.errors.unknownProvider',
  oauth_rate_limited: 'auth.oauth.errorPage.rateLimited',
  oauth_provider_not_configured: 'auth.oauth.errorPage.providerNotConfigured',
  oauth_phone_taken: 'auth.oauth.errorPage.phoneTaken',
}

function OAuthErrorContent() {
  const t = useT()
  const searchParams = useSearchParams()
  const intent = searchParams.get('intent') === 'link' ? 'link' : 'auth'
  const codeRaw = searchParams.get('code')
  const code: OAuthBrowserErrorCode = codeRaw && isOAuthBrowserErrorCode(codeRaw) ? codeRaw : 'oauth_unknown'
  const retryAfter = Number(searchParams.get('retryAfter') ?? 0)

  const messageKey = ERROR_MESSAGE_KEYS[code]
  const message = code === 'oauth_rate_limited' && retryAfter > 0 ? t('auth.oauth.errorPage.rateLimitedWithRetry', { seconds: retryAfter }) : t(messageKey)

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-6 px-4 py-12 text-center">
      <div className="flex flex-col gap-2">
        <Typography variant="heading-2">{intent === 'link' ? t('auth.oauth.errorPage.linkTitle') : t('auth.oauth.errorPage.title')}</Typography>
        <Typography variant="Body/M/Regular" className="text-muted-foreground">
          {message}
        </Typography>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {intent === 'link' ? (
          <Button asChild variant="default">
            <Link href="/profile#connected-accounts">{t('auth.oauth.errorPage.backToProfile')}</Link>
          </Button>
        ) : (
          <Button asChild variant="default">
            <Link href="/login">{t('auth.oauth.errorPage.backToLogin')}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

export default function OAuthErrorPage() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center">
      <Suspense fallback={<SpinnerScreen />}>
        <OAuthErrorContent />
      </Suspense>
    </div>
  )
}
