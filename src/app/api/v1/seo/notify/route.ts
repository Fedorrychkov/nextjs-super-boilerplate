import type { NextRequest } from 'next/server'

import { getServerTFromNextRequest } from '~/lib/i18n/server'
import { notifySearchEngines } from '~/lib/seo/indexing'
import { jsonStringifySafety } from '~/utils/jsonSafe'

/**
 * Single point of notification of search engines when publishing.
 * POST body: { urls: string[], indexNow?: boolean, google?: boolean }
 * Call from backend when publishing/updating articles (or from your own API publishing).
 */
export const POST = async (request: NextRequest) => {
  const { t } = getServerTFromNextRequest(request)

  const body = (await request.json()) as {
    urls?: string[]
    indexNow?: boolean
    google?: boolean
  }

  const { urls, indexNow = true, google = true } = body

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return new Response(jsonStringifySafety({ error: t('errors.urlsArrayRequired') }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  await notifySearchEngines(urls, { indexNow, google })

  return new Response(
    jsonStringifySafety({
      ok: true,
      message: t('errors.indexNowBingYandexChatGPTAndGoogleIndexingApiNotified'),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  )
}
