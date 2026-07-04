import { headers } from 'next/headers'

import { seoConfig } from '~/lib/seo/config'

import { trackAiReferralVisit } from './aiReferrals'

/**
 * Call from `app/layout.tsx` (Server Component): one `await trackAiReferralVisit` per request, server-only.
 * `x-pathname` / `x-search` are forwarded by `src/proxy.ts` (Next 16 proxy instead of middleware).
 * On client navigation the root layout usually does not re-run — the event fires only on full load / hard refresh.
 */
export async function trackAiReferralFromRequestHeaders(): Promise<void> {
  const h = await headers()

  if (h.get('next-router-prefetch') === '1') {
    return
  }

  const pathname = h.get('x-pathname')?.trim() || '/'
  const search = h.get('x-search') ?? ''
  const base = seoConfig.siteUrl.replace(/\/+$/, '')
  const pageUrl = `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}${search}`

  try {
    await trackAiReferralVisit({
      pathname: pathname.length > 1024 ? pathname.slice(0, 1024) : pathname,
      referrer: h.get('referer') ?? h.get('referrer'),
      pageUrl,
      userAgent: h.get('user-agent'),
    })
  } catch {
    // do not break rendering on a DB failure
  }
}
