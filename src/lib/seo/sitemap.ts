import type { MetadataRoute } from 'next'

import { seoConfig } from './config'

type ArticleLike = {
  slug: string
  updatedAt?: string
}

export const getStaticRoutes = (): MetadataRoute.Sitemap => [
  {
    url: seoConfig.siteUrl,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 1,
  },
  {
    url: `${seoConfig.siteUrl}/login`,
    lastModified: new Date(),
    changeFrequency: 'yearly',
    priority: 0.2,
  },
  {
    url: `${seoConfig.siteUrl}/profile`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.4,
  },
]

export const mapArticlesToSitemap = (articles: ArticleLike[], basePath = '/'): MetadataRoute.Sitemap =>
  articles.map((article) => ({
    url: `${seoConfig.siteUrl}${basePath}${article.slug}`,
    lastModified: article.updatedAt ? new Date(article.updatedAt) : new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }))
