import { logger } from '~/utils/logger'

import { seoConfig } from './config'

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow'

export const pingIndexNow = async (urls: string[]) => {
  const key = process.env.INDEXNOW_API_KEY
  const keyLocation = process.env.INDEXNOW_KEY_LOCATION ?? `${seoConfig.siteUrl}/indexnow.txt`

  if (!key) {
    logger.warn('[seo] INDEXNOW_API_KEY is not configured, skipping IndexNow ping')

    return
  }

  const body = {
    host: new URL(seoConfig.siteUrl).host,
    key,
    keyLocation,
    urlList: urls,
  }

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
    })
  }
}

export const notifyGoogleIndexing = async (_urls: string[]) => {
  logger.warn('[seo] Google Indexing API is not configured in boilerplate, skipping')
}
