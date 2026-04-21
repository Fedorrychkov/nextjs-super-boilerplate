import { ArticleStatus, ArticleVisibility } from '~/api/article'
import type { ArticleRevisionSeoMetadata } from '~/api/article-revision'

import { buildDefaultArticleUrl, resolveArticleCanonicalUrl } from './articleCanonical'
import { collectIndexablePublicUrlsForArticleSnapshot, collectPublishedIndexableArticleUrlsForTranslationGroups } from './articleTranslationAlternates'
import { seoConfig } from './config'

/**
 * Minimal article + live-revision SEO snapshot for IndexNow URL resolution.
 * `revisionSeo` must be the `metadata.seo` of the revision that is (or was) live for this slug.
 */
export type ArticleIndexingSnapshot = {
  status: string | null | undefined
  visibility: string | null | undefined
  slug: string | null | undefined
  translationGroupId?: string | null | undefined
  revisionSeo?: ArticleRevisionSeoMetadata | null
}

function translationGroupIdsUnion(before: ArticleIndexingSnapshot, after: ArticleIndexingSnapshot): string[] {
  const set = new Set<string>()
  for (const g of [before.translationGroupId, after.translationGroupId]) {
    if (g != null && String(g).trim()) {
      set.add(String(g).trim())
    }
  }

  return [...set]
}

/**
 * Builds the list of absolute URLs to send to IndexNow / Google Indexing (same rules as `article/update`).
 *
 * **Unpublish / noindex / lost public:** we still include the URL that **stopped** being indexable (`previousIndexableUrls`)
 * plus remaining group URLs. IndexNow has no separate “delete URL” verb: asking crawlers to **re-fetch** the URL is how
 * they discover 410/404 or noindex and update the index.
 *
 * **Still indexable (e.g. text edit, same slug/canonical):** returns canonical + default public and/or full translation group set.
 */
export async function resolveIndexingUrlsForArticleTransition(params: { before: ArticleIndexingSnapshot; after: ArticleIndexingSnapshot }): Promise<string[]> {
  const { before, after } = params

  const prevNoindex = before.revisionSeo?.noindex === true
  const wasPublishedPublic =
    before.status === ArticleStatus.PUBLISHED &&
    before.visibility === ArticleVisibility.PUBLIC &&
    Boolean(before.slug != null ? String(before.slug).trim() : '')
  const wasIndexable = wasPublishedPublic && !prevNoindex

  const previousIndexableUrls = collectIndexablePublicUrlsForArticleSnapshot({
    status: before.status,
    visibility: before.visibility,
    slug: before.slug,
    seo: before.revisionSeo ?? null,
  })

  const isPublishedPublic = after.status === ArticleStatus.PUBLISHED && after.visibility === ArticleVisibility.PUBLIC
  const nextSeo = after.revisionSeo ?? {}
  const shouldIndex = isPublishedPublic && nextSeo.noindex !== true

  const slugAfter = after.slug != null ? String(after.slug).trim() : ''
  const visibilityAfter = (after.visibility as ArticleVisibility | undefined) ?? ArticleVisibility.PUBLIC
  const canonicalUrl = slugAfter && isPublishedPublic ? resolveArticleCanonicalUrl(seoConfig.siteUrl, slugAfter, visibilityAfter, nextSeo.canonicalUrl) : null
  const defaultPublicUrl = slugAfter && isPublishedPublic ? buildDefaultArticleUrl(seoConfig.siteUrl, slugAfter, ArticleVisibility.PUBLIC) : null

  const groupIds = translationGroupIdsUnion(before, after)
  const { canonicals: groupCanonicals } =
    groupIds.length > 0 ? await collectPublishedIndexableArticleUrlsForTranslationGroups(groupIds) : { canonicals: [] as string[] }

  const fallbackUrls = shouldIndex && canonicalUrl ? Array.from(new Set([canonicalUrl, defaultPublicUrl].filter((url): url is string => Boolean(url)))) : []

  let urlsForIndexing: string[] = []

  if (shouldIndex && canonicalUrl) {
    urlsForIndexing = groupCanonicals.length > 0 ? groupCanonicals : fallbackUrls
  } else if (wasIndexable && !shouldIndex) {
    urlsForIndexing = Array.from(new Set([...previousIndexableUrls, ...groupCanonicals]))
  }

  return urlsForIndexing
}
