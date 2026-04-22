import { coerceLocale, getDefaultLocale } from '~/lib/i18n/config'

import { seoConfig } from './config'

/**
 * Canonical BCP-47 language tag for `Article.locale` and revision `metadata.seo.language`
 * (any valid tag, not limited to app UI locales). Uses `Intl.getCanonicalLocales`.
 */
export const normalizeBcp47ArticleLocale = (input: string | null | undefined): string | null => {
  const raw = input?.trim()

  if (!raw) {
    return null
  }

  const normalized = raw.replace(/_/g, '-')

  try {
    const [tag] = Intl.getCanonicalLocales(normalized)

    if (!tag || tag.length > 35) {
      return null
    }

    return tag.toLowerCase()
  } catch {
    return null
  }
}

export const normalizeArticleLanguage = (input: string | null | undefined): string | null => {
  return normalizeBcp47ArticleLocale(input) ?? coerceLocale(input) ?? null
}

export const resolveArticleLanguage = (input: string | null | undefined): string => {
  return normalizeArticleLanguage(input) ?? seoConfig.defaultLocale
}

/** Open Graph `og:locale` / Next metadata — expects `en_US`, `ru_RU`, not bare `en`. */
export const toOgLocale = (locale: string): string => {
  const l = coerceLocale(locale) ?? getDefaultLocale()

  return l === 'ru' ? 'ru_RU' : 'en_US'
}

/** Paired locale for `og:locale:alternate` on bilingual pages. */
export const getAlternateOgLocale = (locale: string): string => {
  const l = coerceLocale(locale) ?? getDefaultLocale()

  return l === 'ru' ? 'en_US' : 'ru_RU'
}
