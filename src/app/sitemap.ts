import type { MetadataRoute } from 'next'

import { getStaticRoutes } from '~/lib/seo/sitemap'

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = getStaticRoutes()

  return [...staticRoutes]
}
