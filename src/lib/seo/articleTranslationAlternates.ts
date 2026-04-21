import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'

import { ArticleStatus, ArticleVisibility } from '~/api/article'
import type { ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { getDefaultLocale } from '~/lib/i18n/config'

import { buildDefaultArticleUrl, resolveArticleCanonicalUrl } from './articleCanonical'
import { resolveArticleLanguage } from './articleLanguage'
import { seoConfig } from './config'

/** Primary language subtag for hreflang / `alternates.languages` keys (e.g. `en-US` → `en`). */
export function normalizeHreflangPrimaryTag(locale: string | null | undefined): string | null {
  if (!locale?.trim()) return null
  const t = locale.trim().toLowerCase()
  const primary = (t.split('-')[0] ?? t).trim()

  if (/^[a-z]{2,8}$/.test(primary)) {
    return primary
  }

  return null
}

function readRevisionSeo(metadata: unknown): ArticleRevisionSeoMetadata {
  const meta = metadata as { seo?: ArticleRevisionSeoMetadata | null } | undefined

  return meta?.seo ?? {}
}

export type TranslationGroupArticleRow = {
  id: string
  slug: string
  locale: string | null
  status: string
  visibility: string
  title: string | null
  revisionId: string | null
}

/**
 * All articles in a translation group (any status) for admin UI.
 * Excludes articles without `translationGroupId`.
 */
export async function loadArticlesInTranslationGroup(translationGroupId: string | null | undefined): Promise<TranslationGroupArticleRow[]> {
  if (!translationGroupId?.trim()) {
    return []
  }

  await connectDB()

  const articles = await Article.find({ translationGroupId: translationGroupId.trim() }).select('_id slug locale status visibility revisionId').lean()

  if (!articles.length) {
    return []
  }

  const revisionIds = Array.from(
    new Set(
      articles
        .map((a) => a.revisionId)
        .filter(Boolean)
        .map((id) => String(id)),
    ),
  ) as string[]

  const revisions =
    revisionIds.length > 0
      ? await ArticleRevision.find({ _id: { $in: revisionIds } })
          .select('_id title')
          .lean()
      : []

  const titleByRevisionId = new Map(revisions.map((r) => [String(r._id), (r.title as string | null | undefined) ?? null]))

  return articles.map((a) => ({
    id: String(a._id),
    slug: String(a.slug ?? ''),
    locale: a.locale != null && String(a.locale).trim() ? String(a.locale).trim().toLowerCase() : null,
    status: String(a.status ?? ''),
    visibility: String(a.visibility ?? ''),
    title: a.revisionId ? (titleByRevisionId.get(String(a.revisionId)) ?? null) : null,
    revisionId: a.revisionId ? String(a.revisionId) : null,
  }))
}

export type PublishedIndexableTranslationMember = {
  slug: string
  hreflangKey: string
  canonicalUrl: string
  /** Normalized full tag from `Article.locale` or revision SEO `language` (lowercase), for Accept-Language matching. */
  localeFull: string | null
}

/**
 * Published, public, indexable articles in a translation group (deduped by hreflang primary key).
 * Empty if the group has fewer than two such language variants.
 */
export async function loadPublishedIndexableTranslationMembers(translationGroupId: string | null | undefined): Promise<PublishedIndexableTranslationMember[]> {
  if (!translationGroupId?.trim()) {
    return []
  }

  await connectDB()

  const articles = await Article.find({
    translationGroupId: translationGroupId.trim(),
    status: ArticleStatus.PUBLISHED,
    visibility: ArticleVisibility.PUBLIC,
    slug: { $exists: true, $nin: [null, ''] },
    revisionId: { $ne: null },
  })
    .select('slug visibility revisionId locale')
    .lean()

  if (articles.length < 2) {
    return []
  }

  const revisionIds = Array.from(new Set(articles.map((a) => String(a.revisionId)).filter(Boolean)))

  const revisions = await ArticleRevision.find({ _id: { $in: revisionIds } })
    .select('metadata')
    .lean()
  const metadataByRevisionId = new Map(revisions.map((r) => [String(r._id), r.metadata]))

  const raw: PublishedIndexableTranslationMember[] = []

  for (const row of articles) {
    const slug = String(row.slug ?? '')
    const metadata = metadataByRevisionId.get(String(row.revisionId))
    const seo = readRevisionSeo(metadata)

    if (seo.noindex === true) {
      continue
    }

    const visibility = (row.visibility as ArticleVisibility | undefined) ?? ArticleVisibility.PUBLIC
    const canonicalUrl = resolveArticleCanonicalUrl(seoConfig.siteUrl, slug, visibility, seo.canonicalUrl)

    const fromArticleLocale = normalizeHreflangPrimaryTag(row.locale != null ? String(row.locale) : undefined)
    const fromSeo = normalizeHreflangPrimaryTag(resolveArticleLanguage(seo.language))
    const hreflangKey = fromArticleLocale ?? fromSeo

    if (!hreflangKey) {
      continue
    }

    const localeFromArticle = row.locale != null && String(row.locale).trim() ? String(row.locale).trim().toLowerCase() : null
    const langSeo = seo.language != null && String(seo.language).trim() ? String(seo.language).trim().toLowerCase() : null
    const localeFull = localeFromArticle ?? langSeo

    raw.push({ slug, hreflangKey, canonicalUrl, localeFull })
  }

  if (raw.length < 2) {
    return []
  }

  const byKey = new Map<string, PublishedIndexableTranslationMember>()

  for (const m of raw) {
    if (!byKey.has(m.hreflangKey)) {
      byKey.set(m.hreflangKey, m)
    }
  }

  if (byKey.size < 2) {
    return []
  }

  return [...byKey.values()]
}

/**
 * Hreflang primary key for the current article (same rules as translation group / metadata map).
 */
export function resolvePublishedArticleHreflangKey(articleLocale: string | null | undefined, revisionSeoLanguage: string | null | undefined): string | null {
  const fromArticle = normalizeHreflangPrimaryTag(articleLocale != null ? String(articleLocale) : undefined)
  const fromSeo = normalizeHreflangPrimaryTag(resolveArticleLanguage(revisionSeoLanguage))

  return fromArticle ?? fromSeo
}

/**
 * Builds `alternates.languages` for Next.js metadata / sitemap when ≥2 indexable public URLs exist in the group.
 */
export async function loadPublishedIndexableAlternatesLanguagesMap(translationGroupId: string | null | undefined): Promise<Record<string, string> | undefined> {
  const list = await loadPublishedIndexableTranslationMembers(translationGroupId)

  if (list.length < 2) {
    return undefined
  }

  const languages: Record<string, string> = {}

  for (const m of list) {
    languages[m.hreflangKey] = m.canonicalUrl
  }

  const defaultLocale = getDefaultLocale()

  if (languages[defaultLocale]) {
    languages['x-default'] = languages[defaultLocale]
  } else {
    const first = list[0]

    if (first) {
      languages['x-default'] = first.canonicalUrl
    }
  }

  return languages
}

/**
 * Canonical + default public URLs for IndexNow / revalidation hints (published, public, not noindex).
 */
export async function collectPublishedIndexableArticleUrlsForTranslationGroups(groupIds: string[]): Promise<{ canonicals: string[]; slugs: string[] }> {
  const trimmed = [...new Set(groupIds.map((g) => g.trim()).filter(Boolean))]

  if (!trimmed.length) {
    return { canonicals: [], slugs: [] }
  }

  await connectDB()

  const articles = await Article.find({
    translationGroupId: { $in: trimmed },
    status: ArticleStatus.PUBLISHED,
    visibility: ArticleVisibility.PUBLIC,
    slug: { $exists: true, $nin: [null, ''] },
    revisionId: { $ne: null },
  })
    .select('slug visibility revisionId')
    .lean()

  if (!articles.length) {
    return { canonicals: [], slugs: [] }
  }

  const revisionIds = Array.from(new Set(articles.map((a) => String(a.revisionId)).filter(Boolean)))
  const revisions = await ArticleRevision.find({ _id: { $in: revisionIds } })
    .select('metadata')
    .lean()
  const metadataByRevisionId = new Map(revisions.map((r) => [String(r._id), r.metadata]))

  const urlSet = new Set<string>()
  const slugs: string[] = []

  for (const row of articles) {
    const slug = String(row.slug ?? '')
    slugs.push(slug)

    const metadata = metadataByRevisionId.get(String(row.revisionId))
    const seo = readRevisionSeo(metadata)

    if (seo.noindex === true) {
      continue
    }

    const visibility = (row.visibility as ArticleVisibility | undefined) ?? ArticleVisibility.PUBLIC
    const canonicalUrl = resolveArticleCanonicalUrl(seoConfig.siteUrl, slug, visibility, seo.canonicalUrl)
    const defaultPublicUrl = buildDefaultArticleUrl(seoConfig.siteUrl, slug, ArticleVisibility.PUBLIC)

    urlSet.add(canonicalUrl)
    urlSet.add(defaultPublicUrl)
  }

  return { canonicals: [...urlSet], slugs: [...new Set(slugs)] }
}

/**
 * All slugs for articles in any of the given groups (any status) — for cache revalidation.
 */
export async function collectSlugsForTranslationGroups(groupIds: string[]): Promise<string[]> {
  const trimmed = [...new Set(groupIds.map((g) => g.trim()).filter(Boolean))]

  if (!trimmed.length) {
    return []
  }

  await connectDB()

  const articles = await Article.find({ translationGroupId: { $in: trimmed } })
    .select('slug')
    .lean()

  return [...new Set(articles.map((a) => String(a.slug ?? '')).filter(Boolean))]
}

/**
 * Public URLs that were indexable for IndexNow (canonical + default public path), or [].
 * Call with article + SEO snapshot **before** a status/metadata change.
 */
export function collectIndexablePublicUrlsForArticleSnapshot(params: {
  status: string | null | undefined
  visibility: string | null | undefined
  slug: string | null | undefined
  seo?: ArticleRevisionSeoMetadata | null
}): string[] {
  if (params.status !== ArticleStatus.PUBLISHED || params.visibility !== ArticleVisibility.PUBLIC) {
    return []
  }

  const slug = params.slug != null ? String(params.slug).trim() : ''

  if (!slug) {
    return []
  }

  const seo = params.seo ?? {}

  if (seo.noindex === true) {
    return []
  }

  const visibility = (params.visibility as ArticleVisibility | undefined) ?? ArticleVisibility.PUBLIC
  const canonicalUrl = resolveArticleCanonicalUrl(seoConfig.siteUrl, slug, visibility, seo.canonicalUrl)
  const defaultPublicUrl = buildDefaultArticleUrl(seoConfig.siteUrl, slug, ArticleVisibility.PUBLIC)

  return Array.from(new Set([canonicalUrl, defaultPublicUrl].filter((u): u is string => Boolean(u))))
}
