import type { AnyString } from '~/types/shared.types'

export const SUPPORTED_LOCALES = ['en', 'ru'] as const
export const COMMON_CONTENT_LANGUAGE_TAGS = [
  'ar',
  'de',
  'en',
  'en-GB',
  'es',
  'fr',
  'it',
  'ja',
  'ko',
  'pl',
  'pt',
  'pt-BR',
  'ru',
  'tr',
  'uk',
  'zh-Hans',
  'zh-Hant',
]

export type SystemLocale = (typeof SUPPORTED_LOCALES)[number]
export type AppLocale = SystemLocale | AnyString

export const LOCALE_COOKIE_NAME = 'locale'

function isSystemLocale(v: string | null | undefined): v is SystemLocale {
  return v === 'en' || v === 'ru'
}

export function getDefaultLocale(): SystemLocale {
  const fromEnv = process.env.NEXT_PUBLIC_DEFAULT_LOCALE

  if (isSystemLocale(fromEnv)) return fromEnv

  return 'en'
}

export function coerceLocale(v: string | null | undefined): AppLocale | null {
  if (!v) return null
  const normalized = v.trim()

  return normalized ? (normalized as AppLocale) : null
}

export function coerceSystemLocale(v: string | null | undefined): SystemLocale | null {
  if (!v) return null
  const normalized = v.trim().toLowerCase()

  return isSystemLocale(normalized) ? normalized : null
}
