import { NEXT_PUBLIC_SITE_URL, SEO_NOTIFY_AUTH_ENABLED, SEO_NOTIFY_SECRET } from '@config/env'
import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Guard for the public SEO indexing endpoints (`/api/v1/seo/*`).
 *
 * These endpoints trigger IndexNow / Google Indexing API calls that consume your API quota,
 * so they should not be callable anonymously. They are meant to be called server-to-server
 * (from your own backend on publish), therefore we gate them on a shared secret header
 * instead of a user session.
 *
 * Rollout is controlled by `SEO_NOTIFY_AUTH_ENABLED`:
 *   - false / unset (default): auth is OFF — endpoints behave as before (no breakage while you migrate callers).
 *   - true: the `x-seo-notify-secret` header must match `SEO_NOTIFY_SECRET`.
 */
export const SEO_NOTIFY_SECRET_HEADER = 'x-seo-notify-secret'

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)

  // timingSafeEqual throws on length mismatch — compare lengths first (already non-secret info).
  if (ab.length !== bb.length) {
    return false
  }

  return timingSafeEqual(ab, bb)
}

/**
 * Returns a NextResponse to short-circuit the handler when the request is not authorized,
 * or `null` when the caller may proceed.
 */
export function assertSeoNotifyAuthorized(request: NextRequest): NextResponse | null {
  // Gradual rollout: when the flag is off, skip the check entirely (endpoints stay open).
  if (!SEO_NOTIFY_AUTH_ENABLED) {
    return null
  }

  if (!SEO_NOTIFY_SECRET) {
    // Enforcement is on but no secret configured — fail closed to avoid a silently-open endpoint.
    return NextResponse.json({ error: 'SEO indexing auth is enabled but SEO_NOTIFY_SECRET is not set.' }, { status: 503 })
  }

  const provided = request.headers.get(SEO_NOTIFY_SECRET_HEADER) ?? ''

  if (!provided || !safeEqual(provided, SEO_NOTIFY_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}

let cachedSiteHost: string | null = null

function getSiteHost(): string {
  if (cachedSiteHost !== null) {
    return cachedSiteHost
  }

  try {
    cachedSiteHost = new URL(NEXT_PUBLIC_SITE_URL).host
  } catch {
    cachedSiteHost = ''
  }

  return cachedSiteHost
}

/**
 * Keep only well-formed URLs that belong to this site's host — prevents the endpoint from being
 * abused to submit arbitrary third-party URLs to search engines under your credentials.
 */
export function filterUrlsToSiteHost(urls: string[]): string[] {
  const host = getSiteHost()

  if (!host) {
    return []
  }

  return urls.filter((url) => {
    try {
      return new URL(url).host === host
    } catch {
      return false
    }
  })
}
