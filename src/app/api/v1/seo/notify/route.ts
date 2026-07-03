import { withGlobalRateLimit } from '@lib/middleware'
import { assertSeoNotifyAuthorized, filterUrlsToSiteHost } from '@lib/security/seo-notify-guard'
import { type NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { notifySearchEngines } from '~/lib/seo/indexing'

/**
 * Single point of notification of search engines when publishing.
 * POST body: { urls: string[], indexNow?: boolean, google?: boolean }
 * Call from backend when publishing/updating articles (or from your own API publishing).
 *
 * Auth: requires the `x-seo-notify-secret` header to match `SEO_NOTIFY_SECRET`.
 * URLs are filtered to this site's host before being submitted.
 */
const handler = async (request: NextRequest) => {
  const { t } = await getServerTFromNextRequestAsync(request)

  const unauthorized = assertSeoNotifyAuthorized(request)

  if (unauthorized) {
    return unauthorized
  }

  const body = (await request.json()) as {
    urls?: string[]
    indexNow?: boolean
    google?: boolean
  }

  const { urls, indexNow = true, google = true } = body

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: t('errors.urlsArrayRequired') }, { status: 400 })
  }

  const allowedUrls = filterUrlsToSiteHost(urls)

  if (allowedUrls.length === 0) {
    return NextResponse.json({ error: t('errors.urlsArrayRequired') }, { status: 400 })
  }

  await notifySearchEngines(allowedUrls, { indexNow, google })

  return NextResponse.json({
    ok: true,
    message: t('errors.indexNowBingYandexChatGPTAndGoogleIndexingApiNotified'),
  })
}

export const POST = withGlobalRateLimit(handler)
