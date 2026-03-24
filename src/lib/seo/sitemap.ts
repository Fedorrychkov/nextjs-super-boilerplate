import { shouldSkipDbDuringBuild } from '@lib/build-phase'
import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import type { MetadataRoute } from 'next'

import { ArticleStatus, ArticleVisibility } from '~/api/article'
import type { ArticleRevisionSeoMetadata } from '~/api/article-revision'

import { seoConfig } from './config'

type ArticleLike = {
  slug: string
  updatedAt?: string | Date | null
}

export type PublicSeoArticle = {
  slug: string
  updatedAt?: string | Date | null
  publishedAt?: string | Date | null
  title?: string | null
  description?: string | null
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

export const getPublishedPublicArticlesForSeo = async (): Promise<PublicSeoArticle[]> => {
  if (shouldSkipDbDuringBuild()) {
    return []
  }

  await connectDB()

  const articles = await Article.find({
    status: ArticleStatus.PUBLISHED,
    visibility: ArticleVisibility.PUBLIC,
    slug: { $exists: true, $nin: [null, ''] },
    revisionId: { $ne: null },
  })
    .select('slug updatedAt publishedAt revisionId')
    .lean()

  if (!articles.length) {
    return []
  }

  const revisionIds = Array.from(new Set(articles.map((item) => String(item.revisionId)).filter(Boolean)))

  const revisions = await ArticleRevision.find({ _id: { $in: revisionIds } })
    .select('_id title description metadata')
    .lean()

  const revisionById = new Map(revisions.map((rev) => [String(rev._id), rev]))

  const result: PublicSeoArticle[] = []

  for (const article of articles) {
    const revision = revisionById.get(String(article.revisionId))
    const rawMetadata = revision?.metadata as { seo?: ArticleRevisionSeoMetadata | null } | undefined
    const seo = rawMetadata?.seo

    if (seo?.noindex === true) {
      continue
    }

    result.push({
      slug: String(article.slug),
      updatedAt: article.updatedAt ?? null,
      publishedAt: article.publishedAt ?? null,
      title: revision?.title ?? null,
      description: revision?.description ?? null,
    })
  }

  return result
}

export const getPublishedPublicSitemapRoutes = async (): Promise<MetadataRoute.Sitemap> => {
  const articles = await getPublishedPublicArticlesForSeo()

  return mapArticlesToSitemap(articles, '/article/')
}
