export const SUPPORTED_LOCALES = ['en', 'ru'] as const

export type AppLocale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_COOKIE_NAME = 'locale'

function isAppLocale(v: string | null | undefined): v is AppLocale {
  return v === 'en' || v === 'ru'
}

export function getDefaultLocale(): AppLocale {
  const fromEnv = process.env.NEXT_PUBLIC_DEFAULT_LOCALE

  if (isAppLocale(fromEnv)) return fromEnv

  return 'en'
}

export function coerceLocale(v: string | null | undefined): AppLocale | null {
  if (!v) return null
  const normalized = v.trim().toLowerCase()

  return isAppLocale(normalized) ? normalized : null
}
