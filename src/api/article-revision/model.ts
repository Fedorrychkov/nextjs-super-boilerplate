import { MediaProvider, MediaResourceType } from '../media/model'

/**
 * Ручные SEO-поля ревизии — кладём в `metadata.seo` (см. ArticleEditableSeo).
 */
export type ArticleRevisionSeoMetadata = {
  /** &lt;title&gt; в выдаче; если пусто — на странице подставляют title ревизии */
  metaTitle?: string | null
  /** meta description */
  metaDescription?: string | null
  /** Полный URL канонической страницы */
  canonicalUrl?: string | null
  /** og:title; если пусто — meta title / title */
  ogTitle?: string | null
  /** og:description */
  ogDescription?: string | null
  /** og:image; если пусто — thumbnailUrl */
  ogImageUrl?: string | null
  /** Twitter / X card type */
  twitterCard?: 'summary' | 'summary_large_image' | null
  /** meta robots: noindex */
  noindex?: boolean | null
  /** meta robots: nofollow */
  nofollow?: boolean | null
  /** meta keywords (опционально, слабая ценность для Google) */
  keywords?: string | null
  ogImageAssetId?: string | null
}

export type ArticleRevisionMediaField = {
  assetId?: string | null
  resourceType?: MediaResourceType | null
  provider?: MediaProvider | null
  url?: string | null
}

export type ArticleRevisionMediaMetadata = {
  thumbnail?: ArticleRevisionMediaField | null
  seoOgImage?: ArticleRevisionMediaField | null
}

export type ArticleRevisionMetadata = {
  seo?: ArticleRevisionSeoMetadata | null
  media?: ArticleRevisionMediaMetadata | null
} & Record<string, unknown>

export type ArticleRevisionModel = {
  id: string
  articleId: string
  title?: string | null
  description?: string | null
  content?: string | null
  metadata?: ArticleRevisionMetadata | Record<string, unknown> | null
  thumbnailUrl?: string | null
  /**
   * Draft (editor) or confirmed after publication
   */
  status?: ArticleRevisionStatus | null
  publishedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export enum ArticleRevisionStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
}
