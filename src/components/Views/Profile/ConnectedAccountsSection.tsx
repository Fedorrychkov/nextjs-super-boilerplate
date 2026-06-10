'use client'

import type { OAuthProviderId } from '@config/auth-oauth'
import { AxiosError } from 'axios'
import { Link2, Unlink } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Button, Typography } from '~/components/ui'
import { OAuthProviderIcon } from '~/components/Views/Auth/OAuthProviderIcon'
import { OAUTH_PROVIDER_LABELS } from '~/lib/auth/oauth-public-config'
import type { AppMessageKey } from '~/lib/i18n/types'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useOAuthUnlinkMutation } from '~/query/auth/mutation/useOAuthUnlinkMutation'
import { useOAuthAccountsQuery } from '~/query/auth/query/useOAuthAccountsQuery'

const OAUTH_ERROR_KEYS: Record<string, AppMessageKey> = {
  oauth_provider_taken: 'auth.oauth.errors.providerTaken',
  oauth_provider_error: 'auth.oauth.errors.providerError',
}

export function ConnectedAccountsSection() {
  const t = useT()
  const { notify } = useNotify()
  const searchParams = useSearchParams()
  const [hydrated, setHydrated] = useState(false)
  const { data, isLoading, refetch } = useOAuthAccountsQuery(hydrated)
  const { unlinkMutation } = useOAuthUnlinkMutation()

  useEffect(() => {
    queueMicrotask(() => {
      setHydrated(true)
    })
  }, [])

  const linkedSet = useMemo(() => new Set((data?.accounts ?? []).map((a) => a.provider)), [data?.accounts])

  useEffect(() => {
    const linked = searchParams.get('oauthLinked')

    if (linked) {
      notify(t('auth.oauth.messages.linked', { provider: OAUTH_PROVIDER_LABELS[linked as OAuthProviderId] ?? linked }), 'success')
      void refetch()
    }

    const err = searchParams.get('oauthError')

    if (err) {
      notify(t(OAUTH_ERROR_KEYS[err] ?? 'auth.oauth.errors.unknown'), 'destructive')
    }
  }, [searchParams, notify, t, refetch])

  if (!hydrated || isLoading) {
    return (
      <div id="connected-accounts" className="flex flex-col rounded-lg border bg-card p-4 space-y-4">
        <Typography variant="Body/S/Regular" className="text-muted-foreground">
          {t('common.loading')}
        </Typography>
      </div>
    )
  }

  const linkProviders = data?.linkProviders ?? []

  if (!linkProviders.length && !(data?.accounts?.length ?? 0)) {
    return null
  }

  const handleUnlink = async (provider: OAuthProviderId) => {
    try {
      await unlinkMutation.mutateAsync(provider)
      notify(t('auth.oauth.messages.unlinked', { provider: OAUTH_PROVIDER_LABELS[provider] }), 'success')
      void refetch()
    } catch (error) {
      const message =
        error instanceof AxiosError && error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data
          ? String((error.response.data as { message?: unknown }).message ?? '')
          : t('errors.unknown')

      notify(message, 'destructive')
    }
  }

  return (
    <div id="connected-accounts" className="flex flex-col rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Typography variant="heading-3">{t('auth.oauth.connectedAccountsTitle')}</Typography>
      </div>

      <Typography variant="Body/S/Regular" className="text-muted-foreground">
        {t('auth.oauth.connectedAccountsDescription')}
      </Typography>

      <div className="flex flex-col gap-2">
        {linkProviders.map((provider) => {
          const linked = linkedSet.has(provider)
          const account = data?.accounts.find((a) => a.provider === provider)

          return (
            <div key={provider} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background">
                  <OAuthProviderIcon provider={provider} size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{OAUTH_PROVIDER_LABELS[provider]}</span>
                  {linked && account?.providerLogin ? <span className="text-xs text-muted-foreground">{account.providerLogin}</span> : null}
                </div>
              </div>
              {linked ? (
                <Button type="button" variant="outline" size="sm-md" disabled={unlinkMutation.isLoading} onClick={() => void handleUnlink(provider)}>
                  <Unlink className="mr-1 h-3.5 w-3.5" aria-hidden />
                  {t('auth.oauth.unlink')}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm-md"
                  onClick={() => {
                    window.location.href = `/api/v1/auth/oauth/${provider}/link/start`
                  }}
                >
                  {t('auth.oauth.link')}
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
