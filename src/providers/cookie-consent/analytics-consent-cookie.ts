/** First-party cookie: optional performance / RUM (Web Vitals) telemetry consent. */

export const ANALYTICS_CONSENT_COOKIE_NAME = 'sb_analytics_consent'

export type AnalyticsConsentCookieValue = 'granted' | 'denied'

export function readAnalyticsConsentCookie(): AnalyticsConsentCookieValue | null {
  if (typeof document === 'undefined') {
    return null
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${ANALYTICS_CONSENT_COOKIE_NAME}=([^;]*)`))
  const raw = match?.[1] ? decodeURIComponent(match[1]) : null

  if (raw === 'granted' || raw === 'denied') {
    return raw
  }

  return null
}

export function writeAnalyticsConsentCookie(value: AnalyticsConsentCookieValue): void {
  if (typeof document === 'undefined') {
    return
  }

  const maxAgeSec = 365 * 24 * 60 * 60
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''

  document.cookie = `${ANALYTICS_CONSENT_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`
}
