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
]

export const mapArticlesToSitemap = (articles: ArticleLike[], basePath = '/'): MetadataRoute.Sitemap =>
  articles.map((article) => ({
    url: `${seoConfig.siteUrl}${basePath}${article.slug}`,
    lastModified: article.updatedAt ? new Date(article.updatedAt) : new Date(),
    changeFrequency: 'daily',
    priority: 0.8,
  }))
