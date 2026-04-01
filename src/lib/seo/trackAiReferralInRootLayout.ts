import { headers } from 'next/headers'

import { seoConfig } from '~/lib/seo/config'

import { trackAiReferralVisit } from './aiReferrals'

/**
 * Вызывать из `app/layout.tsx` (Server Component): один `await trackAiReferralVisit` на запрос, только на сервере.
 * `x-pathname` / `x-search` пробрасывает `src/proxy.ts` (Next 16 proxy вместо middleware).
 * При клиентской навигации корневой layout обычно не выполняется повторно — событие только на полной загрузке / hard refresh.
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
    // не ломаем отрисовку при сбое БД
  }
}
