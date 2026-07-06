import { shouldSkipDbDuringBuild } from '@lib/build-phase'
import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import type { MetadataRoute } from 'next'

import { ArticleStatus, ArticleVisibility } from '~/api/article'
import type { ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { getDefaultLocale } from '~/lib/i18n/config'
import { getSitemapRoutesFromConfig } from '~/lib/routes/seo'

import { buildDefaultArticleUrl } from './articleCanonical'
import { loadPublishedIndexableAlternatesLanguagesMap } from './articleTranslationAlternates'
import { seoConfig } from './config'

type ArticleLike = {
  slug: string
  updatedAt?: string | Date | null
  translationGroupId?: string | null
}

export type PublicSeoArticle = {
  slug: string
  updatedAt?: string | Date | null
  publishedAt?: string | Date | null
  title?: string | null
  description?: string | null
  translationGroupId?: string | null
  locale?: string | null
}

const baseUrl = seoConfig.siteUrl.replace(/\/+$/, '')

export const getStaticRoutes = (): MetadataRoute.Sitemap => getSitemapRoutesFromConfig(baseUrl)

function toTimeMs(value: string | Date | null | undefined): number {
  if (value == null) {
    return 0
  }

  const t = typeof value === 'string' ? new Date(value).getTime() : value.getTime()

  return Number.isNaN(t) ? 0 : t
}

function normalizeUrlHref(url: string): string {
  try {
    return new URL(url.trim()).href
  } catch {
    return url.trim()
  }
}

function pickTranslationGroupRepresentative(members: PublicSeoArticle[], languages: Record<string, string> | undefined): PublicSeoArticle {
  if (members.length === 1) {
    return members[0]!
  }

  const defaultLocale = getDefaultLocale()
  const preferredHref = languages?.['x-default'] ?? languages?.[defaultLocale]

  if (preferredHref) {
    const target = normalizeUrlHref(preferredHref)
    const byPreferred = members.find((m) => normalizeUrlHref(buildDefaultArticleUrl(seoConfig.siteUrl, m.slug, ArticleVisibility.PUBLIC)) === target)

    if (byPreferred) {
      return byPreferred
    }
  }

  const primary = (loc: string | null | undefined) => (loc && String(loc).trim() ? (String(loc).trim().split('-')[0]?.toLowerCase() ?? '') : '')

  const byLocale = members.find((m) => primary(m.locale) === defaultLocale)

  if (byLocale) {
    return byLocale
  }

  return [...members].sort((a, b) => a.slug.localeCompare(b.slug))[0]!
}

function withGroupMaxTimestamps(rep: PublicSeoArticle, members: PublicSeoArticle[]): PublicSeoArticle {
  let maxU = 0
  let maxP = 0

  for (const m of members) {
    maxU = Math.max(maxU, toTimeMs(m.updatedAt))
    maxP = Math.max(maxP, toTimeMs(m.publishedAt))
  }

  return {
    ...rep,
    updatedAt: maxU > 0 ? new Date(maxU).toISOString() : rep.updatedAt,
    publishedAt: maxP > 0 ? new Date(maxP).toISOString() : rep.publishedAt,
  }
}

/**
 * One row per translation group: hreflang alternatives already list all languages, so separate `<url>` entries per slug are not needed.
 */
export function dedupePublicSeoArticlesForSitemap(articles: PublicSeoArticle[], alternatesByGroupId: Map<string, Record<string, string>>): PublicSeoArticle[] {
  const membersByGroup = new Map<string, PublicSeoArticle[]>()

  for (const a of articles) {
    const gid = a.translationGroupId?.trim()

    if (!gid) {
      continue
    }

    const list = membersByGroup.get(gid) ?? []
    list.push(a)
    membersByGroup.set(gid, list)
  }

  const emittedGroupIds = new Set<string>()
  const out: PublicSeoArticle[] = []

  for (const a of articles) {
    const gid = a.translationGroupId?.trim()

    if (!gid) {
      out.push(a)

      continue
    }

    if (emittedGroupIds.has(gid)) {
      continue
    }

    emittedGroupIds.add(gid)

    const members = membersByGroup.get(gid) ?? [a]
    const languages = alternatesByGroupId.get(gid)
    const rep = pickTranslationGroupRepresentative(members, languages)

    out.push(withGroupMaxTimestamps(rep, members))
  }

  return out
}

export const mapArticlesToSitemap = (articles: ArticleLike[], alternatesByGroupId?: Map<string, Record<string, string>>): MetadataRoute.Sitemap =>
  articles.map((article) => {
    const groupId =
      'translationGroupId' in article && typeof article.translationGroupId === 'string' && article.translationGroupId.trim()
        ? article.translationGroupId.trim()
        : null
    const languages = groupId ? alternatesByGroupId?.get(groupId) : undefined

    return {
      url: buildDefaultArticleUrl(seoConfig.siteUrl, article.slug, ArticleVisibility.PUBLIC),
      lastModified: article.updatedAt ? new Date(article.updatedAt) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
      ...(languages && Object.keys(languages).length >= 2 ? { alternates: { languages } } : {}),
    }
  })

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
    .select('slug updatedAt publishedAt revisionId translationGroupId locale')
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
      translationGroupId: article.translationGroupId != null ? String(article.translationGroupId).trim() || null : null,
      locale: article.locale != null ? String(article.locale).trim().toLowerCase() || null : null,
    })
  }

  return result
}

export const getPublishedPublicSitemapRoutes = async (): Promise<MetadataRoute.Sitemap> => {
  const articles = await getPublishedPublicArticlesForSeo()

  const uniqueGroupIds = [...new Set(articles.map((a) => a.translationGroupId).filter((g): g is string => Boolean(g?.trim())))]

  const alternatesByGroupId = new Map<string, Record<string, string>>()

  await Promise.all(
    uniqueGroupIds.map(async (groupId) => {
      const languages = await loadPublishedIndexableAlternatesLanguagesMap(groupId)

      if (languages) {
        alternatesByGroupId.set(groupId, languages)
      }
    }),
  )

  const articlesForSitemap = dedupePublicSeoArticlesForSitemap(articles, alternatesByGroupId)

  return mapArticlesToSitemap(articlesForSitemap, alternatesByGroupId)
}
