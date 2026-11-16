'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

import { flush, trackError, trackPage } from '~/lib/metrics/tracker'
import { useCookieConsent } from '~/providers/cookie-consent'

/**
 * Wires the browser into the metrics facade: page views after analytics consent (the same consent
 * as RUM), uncaught errors always — they are operational reports, scrubbed on the server and
 * carrying no page content. Mounted lazily in `DeferredClientChrome`.
 */
export function MetricsBridge() {
  const pathname = usePathname()
  const { analyticsGranted } = useCookieConsent()

  useEffect(() => {
    if (analyticsGranted && pathname) trackPage(pathname)
  }, [analyticsGranted, pathname])

  useEffect(() => {
    const onError = (event: ErrorEvent) => trackError(event.error ?? event.message, window.location.pathname)
    const onRejection = (event: PromiseRejectionEvent) => trackError(event.reason, window.location.pathname)
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush(true)
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)
    document.addEventListener('visibilitychange', onHide)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [])

  return null
}
