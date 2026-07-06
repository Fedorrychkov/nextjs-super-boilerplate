'use client'

import { useState } from 'react'

import type { ApiTokenScope } from '~/api/api-token'
import { InputField } from '~/components/Fields'
import { Typography } from '~/components/ui'
import { Button } from '~/components/ui/button'
import type { AppMessageKey } from '~/lib/i18n/types'
import { useT } from '~/providers'

export type McpOAuthConsentParams = {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
  resource: string
}

type Props = {
  clientName: string
  params: McpOAuthConsentParams
  /** Scopes the role policy allows (checkbox list). */
  allowedScopes: ApiTokenScope[]
  /** Scopes checked by default (requested ∩ allowed, or the policy defaults). */
  preselectedScopes: ApiTokenScope[]
  maxExpiresDays: number
  defaultExpiresDays: number
}

/**
 * OAuth consent screen for MCP hosts (Claude.ai/Desktop custom connectors).
 * The decision is executed by `POST /api/oauth/mcp/consent` (JWT cookie auth) which re-validates
 * everything server-side and returns the redirect URL — hidden params here are just transport.
 */
export const McpOAuthConsentScreen = ({ clientName, params, allowedScopes, preselectedScopes, maxExpiresDays, defaultExpiresDays }: Props) => {
  const t = useT()
  const [scopes, setScopes] = useState<ApiTokenScope[]>(preselectedScopes)
  const [expiresDays, setExpiresDays] = useState(defaultExpiresDays)
  const [pending, setPending] = useState<'approve' | 'deny' | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleScope = (scope: ApiTokenScope) => {
    setScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]))
  }

  const submit = async (decision: 'approve' | 'deny') => {
    setPending(decision)
    setError(null)

    try {
      const response = await fetch('/api/oauth/mcp/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          clientId: params.clientId,
          redirectUri: params.redirectUri,
          state: params.state,
          codeChallenge: params.codeChallenge,
          resource: params.resource || undefined,
          scopes,
          expiresDays,
        }),
      })

      const data = (await response.json().catch(() => null)) as { redirectUrl?: string; message?: string } | null

      if (!response.ok || !data?.redirectUrl) {
        setError(data?.message || t('mcpOauth.errors.generic'))
        setPending(null)

        return
      }

      setRedirecting(true)
      window.location.assign(data.redirectUrl)
    } catch {
      setError(t('mcpOauth.errors.generic'))
      setPending(null)
    }
  }

  if (redirecting) {
    return (
      <Typography variant="Body/M/Regular" tone="muted" className="text-center py-12">
        {t('mcpOauth.redirecting')}
      </Typography>
    )
  }

  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-6 py-12 px-4">
      <div className="flex flex-col gap-2 text-center">
        <Typography asTag="h1" variant="heading-2">
          {t('mcpOauth.title')}
        </Typography>
        <Typography variant="Body/M/Regular" tone="muted">
          {t('mcpOauth.subtitle', { clientName })}
        </Typography>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border p-4">
        <Typography variant="Body/S/Semibold">{t('mcpOauth.scopesTitle')}</Typography>

        {allowedScopes.map((scope) => (
          <Typography key={scope} asTag="label" variant="Body/S/Regular" className="flex items-start gap-2 cursor-pointer">
            {/* eslint-disable-next-line no-restricted-syntax -- bare checkbox: InputField renders a full labeled text field, not suitable here */}
            <input type="checkbox" className="mt-1" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} />
            {/* eslint-disable-next-line no-restricted-syntax -- purely presentational layout wrapper */}
            <span className="flex flex-col">
              <Typography asTag="span" variant="Body/S/Semibold" className="font-mono">
                {scope}
              </Typography>
              <Typography asTag="span" variant="Body/XS/Regular" tone="muted">
                {t(`apiTokens.scopeDescriptions.${scope}` as AppMessageKey)}
              </Typography>
            </span>
          </Typography>
        ))}
      </div>

      <div className="rounded-lg border p-4">
        <InputField
          name="mcp-oauth-expires"
          type="number"
          label={t('mcpOauth.expiresTitle')}
          value={String(expiresDays)}
          min={1}
          max={maxExpiresDays}
          onChange={(event) => setExpiresDays(Math.min(maxExpiresDays, Math.max(1, Math.floor(Number(event.target.value) || 1))))}
          hintText={t('apiTokens.errors.expiresRange', { max: maxExpiresDays })}
        />
      </div>

      {error ? (
        <Typography variant="Body/S/Regular" className="text-destructive text-center">
          {error}
        </Typography>
      ) : null}

      <div className="flex gap-3 justify-center">
        <Button variant="outline" disabled={pending !== null} onClick={() => submit('deny')}>
          {t('mcpOauth.deny')}
        </Button>
        <Button disabled={pending !== null || !scopes.length} onClick={() => submit('approve')}>
          {t('mcpOauth.approve')}
        </Button>
      </div>
    </div>
  )
}
