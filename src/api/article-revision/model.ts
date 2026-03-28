import { MediaProvider, MediaResourceType } from '../media/model'

/**
 * Manual SEO fields for revision — put in `metadata.seo` (see ArticleEditableSeo).
 */
export type ArticleRevisionSeoMetadata = {
  /** &lt;title&gt; in search results; if empty, the revision title is used */
  metaTitle?: string | null
  /** meta description */
  metaDescription?: string | null
  /** Full URL of the canonical page */
  canonicalUrl?: string | null
  /** og:title; if empty, the meta title / title is used */
  ogTitle?: string | null
  /** og:description */
  ogDescription?: string | null
  /** og:image; if empty, the thumbnailUrl is used */
  ogImageUrl?: string | null
  /** Twitter / X card type */
  twitterCard?: 'summary' | 'summary_large_image' | null
  /** meta robots: noindex */
  noindex?: boolean | null
  /** meta robots: nofollow */
  nofollow?: boolean | null
  /** meta keywords (optional, weak value for Google) */
  keywords?: string | null
  /** Primary language of the article content (BCP 47 / app locale, e.g. "en", "ru"). */
  language?: string | null
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
  /** Views attributed to this revision while it was live. */
  viewCount?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

export enum ArticleRevisionStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
}
