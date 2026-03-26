import { ArticleVisibility } from '~/api/article'

import type { TFunction } from '../i18n'

export function getArticleSegmentPath(visibility: ArticleVisibility | null | undefined): 'article' | 'private-article' {
  return visibility === ArticleVisibility.PUBLIC ? 'article' : 'private-article'
}

/** Default public URL for an article (aligned with SEO step placeholder). */
export function buildDefaultArticleUrl(siteUrl: string, slug: string, visibility: ArticleVisibility | null | undefined): string {
  const base = siteUrl.replace(/\/+$/, '')
  const segment = getArticleSegmentPath(visibility)

  return `${base}/${segment}/${encodeURIComponent(slug)}`
}

export function normalizeSiteOrigin(siteUrl: string): string {
  try {
    return new URL(siteUrl).origin
  } catch {
    return ''
  }
}

/**
 * Effective canonical for rendering: validated same-origin override, otherwise default article URL.
 * Invalid stored values fall back to default (defense-in-depth for old/bad data).
 */
export function resolveArticleCanonicalUrl(
  siteUrl: string,
  slug: string,
  visibility: ArticleVisibility | null | undefined,
  seoCanonical: string | null | undefined,
): string {
  const trimmed = seoCanonical?.trim()

  if (!trimmed) {
    return buildDefaultArticleUrl(siteUrl, slug, visibility)
  }

  try {
    const u = new URL(trimmed)

    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return buildDefaultArticleUrl(siteUrl, slug, visibility)
    }

    const siteOrigin = normalizeSiteOrigin(siteUrl)

    if (!siteOrigin || u.origin !== siteOrigin) {
      return buildDefaultArticleUrl(siteUrl, slug, visibility)
    }

    return u.href
  } catch {
    return buildDefaultArticleUrl(siteUrl, slug, visibility)
  }
}

export type CanonicalValidationResult = { ok: true; value: string | null } | { ok: false; message: string }

/** API / form: empty → null; otherwise absolute http(s) on the same origin as the site. */
export function validateCanonicalUrlForStorage(raw: string | null | undefined, siteUrl: string, t: TFunction): CanonicalValidationResult {
  if (raw === null || raw === undefined) {
    return { ok: true, value: null }
  }

  const text = String(raw).trim()

  if (!text) {
    return { ok: true, value: null }
  }

  try {
    const u = new URL(text)

    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, message: t('article.errors.canonicalUrlMustUseHttpOrHttps') }
    }

    const siteOrigin = normalizeSiteOrigin(siteUrl)

    if (!siteOrigin) {
      return { ok: false, message: t('article.errors.siteUrlIsNotConfigured') }
    }

    if (u.origin !== siteOrigin) {
      return { ok: false, message: t('article.errors.canonicalUrlMustUseSameHostAsSite') }
    }

    return { ok: true, value: u.href }
  } catch {
    return { ok: false, message: t('article.errors.canonicalUrlMustBeValidAbsoluteUrl') }
  }
}
