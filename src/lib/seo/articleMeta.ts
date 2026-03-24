import type { ArticleModel } from '~/api/article'
import type { ArticleRevisionSeoMetadata } from '~/api/article-revision'

import { resolveArticleCanonicalUrl } from './articleCanonical'
import { seoConfig } from './config'

type RevisionLike = {
  title?: string | null
  description?: string | null
  thumbnailUrl?: string | null
}

/**
 * Single place for public `/article/[slug]` meta fallbacks (title, description, OG, canonical).
 */
export function resolvePublicArticlePageMeta(params: {
  slug: string
  revision: RevisionLike
  article: Pick<ArticleModel, 'slug' | 'visibility'>
  seo: ArticleRevisionSeoMetadata
}) {
  const { slug, revision, article, seo } = params
  const fallbackTitle = revision.title?.trim() || article.slug?.trim() || slug
  const title = seo.metaTitle?.trim() || fallbackTitle
  const description = seo.metaDescription?.trim() || revision.description?.trim() || 'Article page'
  const ogTitle = seo.ogTitle?.trim() || seo.metaTitle?.trim() || title
  const ogDescription = seo.ogDescription?.trim() || description
  const image = seo.ogImageUrl?.trim() || revision.thumbnailUrl || undefined
  const canonical = resolveArticleCanonicalUrl(seoConfig.siteUrl, slug, article.visibility, seo.canonicalUrl)

  return {
    title,
    description,
    ogTitle,
    ogDescription,
    image,
    canonical,
  }
}
