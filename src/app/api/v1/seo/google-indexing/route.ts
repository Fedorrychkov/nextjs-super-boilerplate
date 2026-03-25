import type { NextRequest } from 'next/server'

import { getServerTFromNextRequest } from '~/lib/i18n'
import { notifyGoogleIndexing } from '~/lib/seo/indexing'
import { jsonStringifySafety } from '~/utils/jsonSafe'

export const POST = async (request: NextRequest) => {
  const { t } = getServerTFromNextRequest(request)
  const { urls } = (await request.json()) as { urls?: string[] }

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return new Response(jsonStringifySafety({ error: 'urls array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  await notifyGoogleIndexing(urls)

  return new Response(
    jsonStringifySafety({
      ok: true,
      message: t('seo.googleIndexing.messages.googleIndexingApiAcceptsOnlyJobPostingBroadcastEvent'),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  )
}
