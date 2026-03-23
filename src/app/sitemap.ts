import type { MetadataRoute } from 'next'

import { getPublishedPublicSitemapRoutes, getStaticRoutes } from '~/lib/seo/sitemap'
import { Logger } from '~/utils/logger'

const logger = new Logger(['Sitemap', '[src/app/sitemap.ts]'])

/** Do not prerender sitemap on `next build` without Mongo */
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const staticRoutes = getStaticRoutes()
    const articleRoutes = await getPublishedPublicSitemapRoutes()

    return [...staticRoutes, ...articleRoutes]
  } catch (error) {
    logger.error(error)

    const staticRoutes = getStaticRoutes()

    return [...staticRoutes]
  }
}
