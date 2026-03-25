import type { NextRequest } from 'next/server'

import { getServerTFromNextRequest } from '~/lib/i18n'
import { pingIndexNow } from '~/lib/seo/indexing'
import { jsonStringifySafety } from '~/utils/jsonSafe'

export const POST = async (request: NextRequest) => {
  const { t } = getServerTFromNextRequest(request)

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
