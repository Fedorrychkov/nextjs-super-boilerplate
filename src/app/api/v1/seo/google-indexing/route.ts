import type { NextRequest } from 'next/server'

import { notifyGoogleIndexing } from '~/lib/seo/indexing'
import { jsonStringifySafety } from '~/utils/jsonSafe'

export const POST = async (request: NextRequest) => {
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
      message: 'Google Indexing API accepts only JobPosting/BroadcastEvent; general pages are indexed via sitemap.',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  )
}
