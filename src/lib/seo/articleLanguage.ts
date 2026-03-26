import { coerceLocale } from '~/lib/i18n'

import { seoConfig } from './config'

export const normalizeArticleLanguage = (input: string | null | undefined): string | null => {
  return coerceLocale(input) ?? null
}

export const resolveArticleLanguage = (input: string | null | undefined): string => {
  return normalizeArticleLanguage(input) ?? seoConfig.defaultLocale
}
