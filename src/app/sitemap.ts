import type { MetadataRoute } from 'next'

import { getPublishedPublicSitemapRoutes, getStaticRoutes } from '~/lib/seo/sitemap'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = getStaticRoutes()
  const articleRoutes = await getPublishedPublicSitemapRoutes()

  return [...staticRoutes, ...articleRoutes]
}
