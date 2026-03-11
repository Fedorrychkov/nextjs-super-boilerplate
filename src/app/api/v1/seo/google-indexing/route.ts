import type { NextRequest } from 'next/server'

import { notifyGoogleIndexing } from '~/lib/seo/indexing'

export const POST = async (request: NextRequest) => {
  const { urls } = (await request.json()) as { urls?: string[] }

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return new Response(JSON.stringify({ error: 'urls array is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    })
  }

  await notifyGoogleIndexing(urls)

  return new Response(JSON.stringify({ ok: true, message: 'Google Indexing API is not fully configured in boilerplate' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
