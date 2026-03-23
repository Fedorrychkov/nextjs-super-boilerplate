import type { NextRequest } from 'next/server'

import { notifySearchEngines } from '~/lib/seo/indexing'

/**
 * Single point of notification of search engines when publishing.
 * POST body: { urls: string[], indexNow?: boolean, google?: boolean }
 * Call from backend when publishing/updating articles (or from your own API publishing).
 */
export const POST = async (request: NextRequest) => {
  const body = (await request.json()) as {
    urls?: string[]
    indexNow?: boolean
    google?: boolean
  }

  const { urls, indexNow = true, google = true } = body

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return new Response(JSON.stringify({ error: 'urls array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  await notifySearchEngines(urls, { indexNow, google })

  return new Response(
    JSON.stringify({
      ok: true,
      message: 'IndexNow (Bing/Yandex/ChatGPT) and optionally Google Indexing API notified.',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    },
  )
}
