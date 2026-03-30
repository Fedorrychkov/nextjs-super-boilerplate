'use client'

import dynamic from 'next/dynamic'

/** Loads after the main bundle — RUM + `web-vitals` stay out of the critical path. */
const WebVitalsReporter = dynamic(() => import('~/providers/Rum/WebVitalsReporter').then((m) => ({ default: m.WebVitalsReporter })), { ssr: false })

/** Banner is non-blocking for LCP; defer to shorten initial JS parse on public pages. */
const CookieConsentBanner = dynamic(() => import('~/providers/cookie-consent/CookieConsentBanner').then((m) => ({ default: m.CookieConsentBanner })), {
  ssr: false,
})

export function DeferredClientChrome() {
  return (
    <>
      <WebVitalsReporter />
      <CookieConsentBanner />
    </>
  )
}
