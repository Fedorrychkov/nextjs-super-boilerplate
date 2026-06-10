import { OAUTH_CONFIG } from '@config/auth-oauth'
import { ValidationError } from '@lib/error/custom-errors'

import type { OAuthFlow, OAuthProviderId } from '~/api/oauth'

import { isProviderAllowedForFlow } from './oauth-flow.service'
import { resolveOAuthRedirectUri } from './oauth-redirect-uri'
import { createOAuthState } from './oauth-state'
import { generatePkcePair } from './pkce'
import { resolveOAuthProvider } from './registry'

export async function buildOAuthStartRedirect(params: {
  provider: OAuthProviderId
  flow: OAuthFlow
  nextPath?: string | null
  actorUserId?: string | null
}): Promise<string> {
  if (!isProviderAllowedForFlow(params.provider, params.flow)) {
    throw new ValidationError(`OAuth provider "${params.provider}" is not enabled for ${params.flow}`)
  }

  if (!OAUTH_CONFIG.isProviderConfigured(params.provider)) {
    throw new ValidationError(`OAuth provider "${params.provider}" is not configured`)
  }

  const adapter = resolveOAuthProvider(params.provider)
  const intent = params.flow === 'link' ? 'link' : 'auth'
  const redirectUri = resolveOAuthRedirectUri(params.provider, intent)
  const scopes = params.flow === 'link' ? adapter.defaultLinkScopes : adapter.defaultSignInScopes

  let codeVerifier: string | undefined
  let codeChallenge: string | undefined

  if (adapter.usesPkce) {
    const pkce = generatePkcePair()
    codeVerifier = pkce.codeVerifier
    codeChallenge = pkce.codeChallenge
  }

  const state = await createOAuthState({
    provider: params.provider,
    flow: params.flow,
    codeVerifier,
    userId: params.actorUserId ?? undefined,
    nextPath: params.nextPath?.startsWith('/') ? params.nextPath : undefined,
  })

  return adapter.getAuthorizationUrl({
    redirectUri,
    state,
    codeChallenge,
    scopes,
    flow: params.flow,
  })
}
