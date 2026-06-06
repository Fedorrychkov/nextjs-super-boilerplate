'use client'

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

import { Logger } from '~/utils/logger'

function nullComponent(): null {
  return null
}

const logger = new Logger(['DeferredClientChrome', '[src/providers/DeferredClientChrome.tsx]'])

/**
 * Wraps a deferred chunk load so ad blockers / stale Turbopack hashes never crash the layout.
 * In production, filters may still block paths like `Rum/WebVitalsReporter` — the app keeps working.
 */
function safeDynamicImport<T extends ComponentType>(importFn: () => Promise<{ default: T }>, label: string) {
  return dynamic(
    () =>
      importFn().catch((error) => {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn(`[DeferredClientChrome] ${label} failed to load (ad blocker, stale chunk, or offline).`, error)
        }

        return { default: nullComponent as unknown as T }
      }),
    { ssr: false, loading: () => null },
  )
}

/** Loads after the main bundle — RUM + `web-vitals` stay out of the critical path. */
const WebVitalsReporter = safeDynamicImport(
  () => import('~/providers/Rum/WebVitalsReporter').then((m) => ({ default: m.WebVitalsReporter })),
  'WebVitalsReporter',
)

/** Banner is non-blocking for LCP; defer to shorten initial JS parse on public pages. */
const CookieConsentBanner = safeDynamicImport(
  () => import('~/providers/cookie-consent/CookieConsentBanner').then((m) => ({ default: m.CookieConsentBanner })),
  'CookieConsentBanner',
)

export function DeferredClientChrome() {
  return (
    <>
      <WebVitalsReporter />
      <CookieConsentBanner />
    </>
  )
}
