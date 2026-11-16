import { NEXT_PUBLIC_SITE_URL } from '@config/env'

import { safeInternalPath } from '~/lib/security/safeInternalPath'

export type OAuthLoginRedirectParams = {
  nextPath?: string | null
  oauthError?: string | null
  oauthMfaChallenge?: string | null
  variant?: 'sign-in' | 'sign-up'
}

export function buildOAuthLoginRedirect(params: OAuthLoginRedirectParams): string {
  const base = NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')
  const url = new URL('/login', base)

  if (params.variant) {
    url.searchParams.set('variant', params.variant)
  }

  // `startsWith('/')` let `//evil.example` through; the same-origin check does not.
  const nextPath = safeInternalPath(params.nextPath, '')

  if (nextPath) {
    url.searchParams.set('nextPath', nextPath)
  }

  if (params.oauthError) {
    url.searchParams.set('oauthError', params.oauthError)
  }

  if (params.oauthMfaChallenge) {
    url.searchParams.set('oauthMfaChallenge', params.oauthMfaChallenge)
  }

  return url.toString()
}

export function buildProfileRedirect(params?: { oauthLinked?: string; oauthError?: string }): string {
  const base = NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')
  const url = new URL('/profile', base)

  if (params?.oauthLinked) {
    url.searchParams.set('oauthLinked', params.oauthLinked)
  }

  if (params?.oauthError) {
    url.searchParams.set('oauthError', params.oauthError)
  }

  // Tabs render lazily: the anchor alone has no target in the DOM until the Security tab is active.
  url.searchParams.set('activeTab', 'security')
  url.hash = 'connected-accounts'

  return url.toString()
}
