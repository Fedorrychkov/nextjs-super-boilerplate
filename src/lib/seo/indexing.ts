import { GOOGLE_INDEXING_CLIENT_EMAIL, GOOGLE_INDEXING_PRIVATE_KEY, INDEXNOW_API_KEY, INDEXNOW_KEY_LOCATION, isProd } from '@config/env'
import jwt from 'jsonwebtoken'

import { getUniqueId } from '~/utils/getUniqueId'
import { jsonStringifySafety } from '~/utils/jsonSafe'
import { Logger } from '~/utils/logger'

import { seoConfig } from './config'

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'
const GOOGLE_OAUTH2_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_INDEXING_PUBLISH_URL = 'https://indexing.googleapis.com/v3/urlNotifications:publish'
const GOOGLE_INDEXING_SCOPE = 'https://www.googleapis.com/auth/indexing'

/** Normalize private key from env (often stored with literal \n). */
function normalizePrivateKey(key: string): string {
  if (key.includes('\\n')) {
    return key.replace(/\\n/g, '\n')
  }

  return key
}

/**
 * Get OAuth2 access token for Google Indexing API (Service Account JWT).
 * Need GOOGLE_INDEXING_CLIENT_EMAIL and GOOGLE_INDEXING_PRIVATE_KEY.
 */
async function getGoogleIndexingAccessToken(): Promise<string | null> {
  const clientEmail = GOOGLE_INDEXING_CLIENT_EMAIL
  const privateKeyRaw = GOOGLE_INDEXING_PRIVATE_KEY

  if (!clientEmail || !privateKeyRaw) {
    return null
  }

  const privateKey = normalizePrivateKey(privateKeyRaw)
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    scope: GOOGLE_INDEXING_SCOPE,
    aud: GOOGLE_OAUTH2_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }

  const signedJwt = jwt.sign(payload, privateKey, { algorithm: 'RS256' })

  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: signedJwt,
  })

  const response = await fetch(GOOGLE_OAUTH2_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as { access_token?: string }

  return data.access_token ?? null
}

export const pingIndexNow = async (urls: string[]) => {
  const logger = new Logger(['pingIndexNow', '[lib/seo/indexing.ts]'])

  const traceId = getUniqueId()

  logger.info('[seo] IndexNow ping start', {
    traceId,
    urls,
  })

  const key = INDEXNOW_API_KEY
  const keyLocation = INDEXNOW_KEY_LOCATION ?? `${seoConfig.siteUrl}/indexnow.txt`

  if (!key) {
    logger.warn('[seo] INDEXNOW_API_KEY is not configured, skipping IndexNow ping', {
      traceId,
    })

    return
  }

  const body = {
    host: new URL(seoConfig.siteUrl).host,
    key,
    keyLocation,
    urlList: urls,
  }

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: jsonStringifySafety(body),
    })

    if (!response.ok) {
      logger.warn('[seo] IndexNow ping failed', {
        status: response.status,
        statusText: response.statusText,
        traceId,
      })
    }
  } catch (error) {
    logger.error('[seo] IndexNow ping error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      traceId,
    })
  }
}

/**
 * Notify Google Indexing API about updating/adding URL.
 * Works only for content types supported by Google: JobPosting, BroadcastEvent.
 * For general articles/blog Google does not accept ping — indexing goes through sitemap and bypass.
 * If GOOGLE_INDEXING_* is not set, the call is simply skipped.
 */
export const notifyGoogleIndexing = async (urls: string[]) => {
  const logger = new Logger(['notifyGoogleIndexing', '[lib/seo/indexing.ts]'])

  if (!GOOGLE_INDEXING_CLIENT_EMAIL || !GOOGLE_INDEXING_PRIVATE_KEY) {
    logger.info('[seo] Google Indexing API credentials not set, skipping')

    return
  }

  const accessToken = await getGoogleIndexingAccessToken()

  if (!accessToken) {
    logger.warn('[seo] Google Indexing API: failed to obtain access token')

    return
  }

  const traceId = getUniqueId()
  logger.info('[seo] Google Indexing API ping start', { traceId, urlsCount: urls.length })

  for (const url of urls) {
    try {
      const response = await fetch(GOOGLE_INDEXING_PUBLISH_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: jsonStringifySafety({
          url,
          type: 'URL_UPDATED',
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        logger.warn('[seo] Google Indexing API request failed for URL', {
          url,
          status: response.status,
          body: text.slice(0, 200),
          traceId,
        })
      }
    } catch (error) {
      logger.error('[seo] Google Indexing API error', {
        url,
        error: error instanceof Error ? error.message : 'Unknown error',
        traceId,
      })
    }
  }
}

export type NotifySearchEnginesOptions = {
  /** Ping IndexNow (Bing, Yandex, ChatGPT). Default: true. */
  indexNow?: boolean
  /** Ping Google Indexing API (only JobPosting/BroadcastEvent). Default: true. */
  google?: boolean
}

/**
 * Single point of notification of search engines when publishing/updating pages.
 * Call when publishing or significant content update (article, vacancy, event).
 *
 * — IndexNow: Bing, Yandex, ChatGPT — fast indexing of any URL.
 * — Google: only if GOOGLE_INDEXING_* is set and content is suitable (JobPosting/BroadcastEvent).
 *
 * **Production only:** when `isProd` is false, this function no-ops (local/stage won’t call IndexNow).
 * For manual pings in dev, use `POST /api/v1/seo/indexnow`, which calls `pingIndexNow` directly and still requires `INDEXNOW_API_KEY`.
 *
 * **Unpublish / 404:** IndexNow has no separate “URL deleted” payload. Including the former public URL means
 * “please re-crawl”; the crawler then sees 404/noindex and updates the index. That is expected, not a mistake.
 *
 * @example
 * In the publication handler:
 * ```ts
 * import { notifySearchEngines } from '~/lib/seo/indexing'
 *
 * const article = await getArticle(slug)
 *
 * if (article) {
 *   await notifySearchEngines([`${siteUrl}/blog/${article.slug}`])
 * }
 * await notifySearchEngines([`${siteUrl}/blog/${article.slug}`])
 * ```
 */
export const notifySearchEngines = async (urls: string[], options: NotifySearchEnginesOptions = {}): Promise<void> => {
  const { indexNow = true, google = true } = options
  const logger = new Logger(['notifySearchEngines', '[lib/seo/indexing.ts]'])

  if (!isProd) {
    logger.warn('[seo] Skipping search engine notification in non-production environment (use POST /api/v1/seo/indexnow to test IndexNow)', {
      urls,
      options,
    })

    return
  }

  const normalized = urls.filter((u) => {
    try {
      new URL(u)

      return true
    } catch {
      return false
    }
  })

  if (normalized.length === 0) {
    return
  }

  if (indexNow) {
    await pingIndexNow(normalized)
  }

  if (google) {
    await notifyGoogleIndexing(normalized)
  }
}
