import { INDEXNOW_API_KEY, INDEXNOW_KEY_LOCATION } from '@config/env'

import { getUniqueId } from '~/utils/getUniqueId'
import { Logger } from '~/utils/logger'

import { seoConfig } from './config'

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

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
      body: JSON.stringify(body),
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

export const notifyGoogleIndexing = async (_urls: string[]) => {
  const logger = new Logger(['notifyGoogleIndexing', '[lib/seo/indexing.ts]'])

  logger.warn('[seo] Google Indexing API is not configured in boilerplate, skipping')
}
