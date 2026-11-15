import { INDEXNOW_API_KEY } from '@config/env'

export const dynamic = 'force-dynamic'

/**
 * The IndexNow key file. Every ping sends `keyLocation` = `<site>/indexnow.txt` (src/lib/seo/indexing.ts),
 * and the search engine fetches it to check the key belongs to this host — without this route the
 * check got a 404 and pings could be rejected. The key is public by the protocol.
 * `INDEXNOW_KEY_LOCATION` still overrides the location when the key is hosted elsewhere.
 */
export const GET = () =>
  INDEXNOW_API_KEY
    ? new Response(INDEXNOW_API_KEY, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } })
    : new Response('Not found', { status: 404 })
