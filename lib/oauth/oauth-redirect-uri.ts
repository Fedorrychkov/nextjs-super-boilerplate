import type { OAuthProviderId } from '@config/auth-oauth'
import { getOAuthCallbackUrl } from '@config/auth-oauth'

import { resolveOAuthProvider } from './registry'

/** Redirect URI sent to the IdP. GitHub allows only one callback URL per OAuth App. */
export function resolveOAuthRedirectUri(provider: OAuthProviderId, intent: 'auth' | 'link'): string {
  const adapter = resolveOAuthProvider(provider)
  const effectiveIntent = adapter.singleRedirectUri ? 'auth' : intent

  return getOAuthCallbackUrl(provider, effectiveIntent)
}
