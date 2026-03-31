import { coerceLocale, getDefaultLocale } from '~/lib/i18n'

import { seoConfig } from './config'

export const normalizeArticleLanguage = (input: string | null | undefined): string | null => {
  return coerceLocale(input) ?? null
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
