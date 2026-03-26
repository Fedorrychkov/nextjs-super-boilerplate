'use client'

import { useEffect } from 'react'
import { type Metric, onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals'

import { useCookieConsent } from '~/providers/cookie-consent'
import { jsonStringifySafety } from '~/utils/jsonSafe'
import { Logger } from '~/utils/logger'

/** Only `NEXT_PUBLIC_*` — do not import server `config/env` in client bundles. */
const rumPublicEnabled = process.env.NEXT_PUBLIC_RUM_ENABLED !== 'false'

/** One decision per page load: ~20% of sessions send all vitals (avoids per-metric server sampling leaving only TTFB). */
const clientSessionSampleRate = Math.min(1, Math.max(0, Number(process.env.NEXT_PUBLIC_RUM_SAMPLE_RATE ?? 0.2)))

const logger = new Logger(['WebVitalsReporter', '[src/providers/Rum/WebVitalsReporter.tsx]'])

function sendToRum(metric: Metric) {
  if (!rumPublicEnabled || typeof window === 'undefined') {
    return
  }

  logger.info('Sending RUM metric to server', { metric })

  const nav = navigator as Navigator & { connection?: { effectiveType?: string } }

  const payload = jsonStringifySafety({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
    delta: metric.delta,
    pathname: window.location.pathname,
    connectionEffectiveType: nav.connection?.effectiveType,
  })

  if (!payload) {
    return
  }

  const url = '/api/v1/rum'

  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }))
  } else {
    void fetch(url, {
      method: 'POST',
      body: payload,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    })
  }
}

export const WebVitalsReporter = () => {
  const { analyticsGranted, hydrated } = useCookieConsent()

  useEffect(() => {
    if (!rumPublicEnabled || !hydrated || !analyticsGranted) {
      return
    }

    const random = Math.random()

    if (random >= clientSessionSampleRate) {
      logger.info('Skipping RUM reporting for this session (sample rate)', { clientSessionSampleRate, random })

      return
    }

    onCLS(sendToRum)
    onINP(sendToRum)
    onLCP(sendToRum)
    onTTFB(sendToRum)
    onFCP(sendToRum)
  }, [analyticsGranted, hydrated])

  return null
}
