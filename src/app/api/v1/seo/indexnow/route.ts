import type { NextRequest } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { pingIndexNow } from '~/lib/seo/indexing'
import { jsonStringifySafety } from '~/utils/jsonSafe'

/**
 * Manual IndexNow ping. Unlike `notifySearchEngines`, this is **not** gated on `isProd` (still needs `INDEXNOW_API_KEY`).
 */
export const POST = async (request: NextRequest) => {
  const { t } = await getServerTFromNextRequestAsync(request)

  const { urls } = (await request.json()) as { urls?: string[] }

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return new Response(jsonStringifySafety({ error: t('errors.urlsArrayRequired') }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  await pingIndexNow(urls)

  return new Response(jsonStringifySafety({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
