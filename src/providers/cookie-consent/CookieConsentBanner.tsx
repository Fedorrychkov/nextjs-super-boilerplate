'use client'

import { useEffect, useState } from 'react'

import { Button } from '~/components/ui/button'
import { Typography } from '~/components/ui/Typography/Typography'

import { useT } from '../i18n'
import { useCookieConsent } from './useCookieConsent'

/** Avoid covering the first screen / LCP: show after the first gesture or on a timer. */
const BANNER_FALLBACK_DELAY_MS = 10_000

const INTERACTION_EVENTS = ['scroll', 'click', 'keydown', 'touchstart', 'pointerdown'] as const

function useDeferredBannerVisibility(showBanner: boolean) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!showBanner) {
      queueMicrotask(() => {
        setVisible(false)
      })

      return
    }

    let cancelled = false

    const removeListeners = (handler: () => void) => {
      for (const type of INTERACTION_EVENTS) {
        window.removeEventListener(type, handler, { capture: true })
      }
    }

    const reveal = (handler: () => void) => {
      if (cancelled) return
      setVisible(true)
      window.clearTimeout(timer)
      removeListeners(handler)
    }

    const onInteract = () => reveal(onInteract)

    const timer = window.setTimeout(() => reveal(onInteract), BANNER_FALLBACK_DELAY_MS)

    for (const type of INTERACTION_EVENTS) {
      window.addEventListener(type, onInteract, { capture: true, passive: true })
    }

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      removeListeners(onInteract)
    }
  }, [showBanner])

  return visible
}

export function CookieConsentBanner() {
  const t = useT()
  const { showBanner, grantAnalytics, denyAnalytics } = useCookieConsent()
  const gateOpen = useDeferredBannerVisibility(showBanner)

  if (!showBanner || !gateOpen) {
    return null
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] border-t border-border bg-background/95 backdrop-blur-sm px-4 py-4 md:px-6 shadow-lg"
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Typography variant="Body/S/Regular" className="text-muted-foreground max-w-2xl">
          {t('cookie.cookieConsentBannerText')}
        </Typography>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={denyAnalytics}>
            {t('cookie.cookieConsentBannerEssentialOnly')}
          </Button>
          <Button type="button" size="sm" onClick={grantAnalytics}>
            {t('cookie.cookieConsentBannerAcceptAnalytics')}
          </Button>
        </div>
      </div>
    </div>
  )
}
