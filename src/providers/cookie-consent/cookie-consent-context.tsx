'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import { type AnalyticsConsentCookieValue, readAnalyticsConsentCookie, writeAnalyticsConsentCookie } from './analytics-consent-cookie'
import { CookieConsentContext } from './useCookieConsent'

const skipBanner = typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SKIP_ANALYTICS_CONSENT === 'true'

type Decision = AnalyticsConsentCookieValue | null

export type CookieConsentContextValue = {
  /** User explicitly allowed analytics (RUM / Web Vitals). */
  analyticsGranted: boolean
  /** `null` until first client read of the cookie (or immediately if env skips consent). */
  decision: Decision
  hydrated: boolean
  grantAnalytics: () => void
  denyAnalytics: () => void
  /** Show bottom banner: no decision stored and consent flow is required. */
  showBanner: boolean
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [decision, setDecision] = useState<Decision>(() => (skipBanner ? 'granted' : null))
  const [hydrated, setHydrated] = useState(() => skipBanner)

  useEffect(() => {
    if (skipBanner) {
      return
    }

    queueMicrotask(() => {
      setDecision(readAnalyticsConsentCookie())
      setHydrated(true)
    })
  }, [])

  const grantAnalytics = useCallback(() => {
    writeAnalyticsConsentCookie('granted')
    setDecision('granted')
  }, [])

  const denyAnalytics = useCallback(() => {
    writeAnalyticsConsentCookie('denied')
    setDecision('denied')
  }, [])

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      analyticsGranted: decision === 'granted',
      decision,
      hydrated,
      grantAnalytics,
      denyAnalytics,
      showBanner: hydrated && decision === null && !skipBanner,
    }),
    [decision, denyAnalytics, grantAnalytics, hydrated],
  )

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>
}
