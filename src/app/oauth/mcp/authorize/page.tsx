import { MCP_OAUTH_CONFIG } from '@config/env'
import type { PageProps } from '@lib/page'
import { getApiTokenPermissionsForRole } from '@lib/services/api-token.service'
import { authService } from '@lib/services/auth.service'
import { isValidCodeChallenge, matchRedirectUri } from '@lib/services/mcp-oauth.helpers'
import { getMcpOAuthClient } from '@lib/services/mcp-oauth.service'
import { cookies } from 'next/headers'
import { notFound, redirect, RedirectType } from 'next/navigation'

import { API_TOKEN_DEFAULT_SCOPES, type ApiTokenScope } from '~/api/api-token'
import { API_TOKEN_DEFAULT_EXPIRES_DAYS, clampExpiresDays, filterApiTokenScopes } from '~/api/api-token/permissions'
import { Typography } from '~/components/ui'
import { McpOAuthConsentScreen } from '~/components/Views/McpOAuth/ConsentScreen'
import { getServerT } from '~/lib/i18n/server'

/**
 * OAuth 2.1 authorization endpoint for the MCP contour (browser page, not an API).
 *
 * Order of checks follows the spec:
 * 1. client_id / redirect_uri are validated FIRST; on failure we render an error and never
 *    redirect (open-redirect defense).
 * 2. Protocol errors with a valid redirect_uri (bad response_type / PKCE) → `?error=…` redirect.
 * 3. No session → existing `/login?nextPath=…` flow, then back here with all params intact.
 * 4. Session + policy OK → consent screen; the decision is executed by `/api/oauth/mcp/consent`.
 */
const McpOAuthAuthorizePage = async (props: PageProps) => {
  if (!MCP_OAUTH_CONFIG.enabled) {
    notFound()
  }

  const searchParams = await props.searchParams
  const first = (key: string): string => {
    const value = searchParams[key]

    return (Array.isArray(value) ? value[0] : value) || ''
  }

  const { t } = await getServerT()

  const clientId = first('client_id').trim()
  const redirectUri = first('redirect_uri')
  const state = first('state')
  const codeChallenge = first('code_challenge')
  const codeChallengeMethod = first('code_challenge_method') || 'S256'
  const scopeParam = first('scope')
  const resource = first('resource')

  const client = clientId ? await getMcpOAuthClient(clientId) : null

  // 1. Unknown client / unregistered redirect: render, never redirect.
  if (!client || !redirectUri || !matchRedirectUri(client.redirectUris, redirectUri)) {
    return <ErrorBlock title={t('mcpOauth.errors.invalidRequest')} description={t('mcpOauth.errors.unknownClient')} />
  }

  // 2. Protocol errors go back to the (validated) client per RFC 6749 §4.1.2.1.
  const redirectWithError = (error: string, description?: string): never => {
    const target = new URL(redirectUri)

    target.searchParams.set('error', error)

    if (description) {
      target.searchParams.set('error_description', description)
    }

    if (state) {
      target.searchParams.set('state', state)
    }

    return redirect(target.toString(), RedirectType.replace)
  }

  if (first('response_type') !== 'code') {
    redirectWithError('unsupported_response_type', 'only response_type=code is supported')
  }

  if (codeChallengeMethod !== 'S256' || !isValidCodeChallenge(codeChallenge)) {
    redirectWithError('invalid_request', 'PKCE with code_challenge_method=S256 is required')
  }

  // 3. Session check; unauthenticated users go through the regular login and come back with all params.
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('accessToken')?.value

  const selfUrl = `/oauth/mcp/authorize?${new URLSearchParams(
    Object.entries(searchParams).flatMap(([key, value]) => (typeof value === 'string' ? [[key, value] as [string, string]] : [])),
  ).toString()}`

  let userRole: string
  let machineAccessBlocked = false

  try {
    if (!accessToken) {
      throw new Error('no access token')
    }

    const user = await authService.validateAccessToken(accessToken)

    userRole = user.role
    machineAccessBlocked = Boolean(user.machineAccessBlockedAt)
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error
    }

    return redirect(`/login?nextPath=${encodeURIComponent(selfUrl)}`, RedirectType.replace)
  }

  if (machineAccessBlocked) {
    return <ErrorBlock title={t('mcpOauth.title')} description={t('mcpOauth.errors.blocked')} />
  }

  // 4. Role policy decides what can be granted at all (including the OAuth channel itself).
  const permissions = await getApiTokenPermissionsForRole(userRole)

  if (!permissions.allowed || !permissions.allowedScopes.length || !permissions.allowedKinds.includes('oauth')) {
    return <ErrorBlock title={t('mcpOauth.title')} description={t('mcpOauth.errors.notAllowedForRole')} />
  }

  const requestedScopes = scopeParam ? (scopeParam.split(/[\s+]+/).filter(Boolean) as string[]) : []
  const requestedAllowed = filterApiTokenScopes(requestedScopes, permissions.allowedScopes)

  if (requestedScopes.length && !requestedAllowed.length) {
    redirectWithError('invalid_scope', 'none of the requested scopes are allowed for this user')
  }

  const defaultScopes = filterApiTokenScopes(API_TOKEN_DEFAULT_SCOPES, permissions.allowedScopes)
  const preselectedScopes: ApiTokenScope[] = requestedAllowed.length ? requestedAllowed : defaultScopes.length ? defaultScopes : permissions.allowedScopes

  const defaultExpiresDays = clampExpiresDays(API_TOKEN_DEFAULT_EXPIRES_DAYS, permissions.maxExpiresDays)

  return (
    <div className="w-full h-full flex justify-center flex-col flex-1">
      <McpOAuthConsentScreen
        clientName={client.clientName}
        params={{ clientId, redirectUri, state, codeChallenge, resource }}
        allowedScopes={permissions.allowedScopes}
        preselectedScopes={preselectedScopes}
        maxExpiresDays={permissions.maxExpiresDays}
        defaultExpiresDays={defaultExpiresDays}
      />
    </div>
  )
}

const ErrorBlock = ({ title, description }: { title: string; description: string }) => (
  <div className="w-full max-w-md mx-auto flex flex-col gap-3 py-16 px-4 text-center">
    <Typography asTag="h1" variant="heading-2">
      {title}
    </Typography>
    <Typography variant="Body/M/Regular" tone="muted">
      {description}
    </Typography>
  </div>
)

export default McpOAuthAuthorizePage
