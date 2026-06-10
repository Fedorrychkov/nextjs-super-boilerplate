'use client'

import type { OAuthFlow, OAuthProviderId } from '~/api/oauth'
import { OAuthProviderCircleButton } from '~/components/Views/Auth/OAuthProviderIcon'
import { getPublicOAuthConfig, OAUTH_PROVIDER_LABELS } from '~/lib/auth/oauth-public-config'
import { useT } from '~/providers'

type Props = {
  flow: Exclude<OAuthFlow, 'link'>
  nextPath?: string | null
  disabled?: boolean
}

export function OAuthProviderButtons({ flow, nextPath, disabled }: Props) {
  const t = useT()
  const config = getPublicOAuthConfig()
  const providers = flow === 'signIn' ? config.signInProviders : config.signUpProviders

  if (config.uiMode === 'credentials_only' || !providers.length) {
    return null
  }

  const startUrl = (provider: OAuthProviderId) => {
    const params = new URLSearchParams({ flow })

    if (nextPath?.startsWith('/')) {
      params.set('nextPath', nextPath)
    }

    return `/api/v1/auth/oauth/${provider}/start?${params.toString()}`
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-3">
      {providers.map((provider) => (
        <OAuthProviderCircleButton
          key={provider}
          provider={provider}
          label={t('auth.oauth.continueWith', { provider: OAUTH_PROVIDER_LABELS[provider] })}
          disabled={disabled}
          onClick={() => {
            window.location.href = startUrl(provider)
          }}
        />
      ))}
    </div>
  )
}

export function OAuthDivider({ flow }: { flow: 'signIn' | 'signUp' }) {
  const t = useT()
  const config = getPublicOAuthConfig()
  const providers = flow === 'signIn' ? config.signInProviders : config.signUpProviders

  if (config.uiMode === 'credentials_only' || config.uiMode === 'oauth_only' || !providers.length) {
    return null
  }

  return (
    <div className="relative my-2 w-full">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground">{t('auth.oauth.orContinueWithEmail')}</span>
      </div>
    </div>
  )
}
