import { withGlobalRateLimit } from '@lib/middleware'
import { assertSeoNotifyAuthorized, filterUrlsToSiteHost } from '@lib/security/seo-notify-guard'
import { type NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { notifyGoogleIndexing } from '~/lib/seo/indexing'

/**
 * Auth: requires the `x-seo-notify-secret` header to match `SEO_NOTIFY_SECRET`.
 * URLs are filtered to this site's host before being submitted.
 */
const handler = async (request: NextRequest) => {
  const { t } = await getServerTFromNextRequestAsync(request)

  const unauthorized = assertSeoNotifyAuthorized(request)

  if (unauthorized) {
    return unauthorized
  }

  const { urls } = (await request.json()) as { urls?: string[] }

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: t('errors.urlsArrayRequired') }, { status: 400 })
  }

  const allowedUrls = filterUrlsToSiteHost(urls)

  if (allowedUrls.length === 0) {
    return NextResponse.json({ error: t('errors.urlsArrayRequired') }, { status: 400 })
  }

  await notifyGoogleIndexing(allowedUrls)

  return NextResponse.json({
    ok: true,
    message: t('seo.googleIndexing.messages.googleIndexingApiAcceptsOnlyJobPostingBroadcastEvent'),
  })
}

export const POST = withGlobalRateLimit(handler)
