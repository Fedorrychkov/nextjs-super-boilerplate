import { type AppLocale, coerceLocale, getDefaultLocale, LOCALE_COOKIE_NAME } from './config'

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const raw = document.cookie || ''

  if (!raw) return null

  const parts = raw.split(';')
  for (const part of parts) {
    const trimmed = part.trim()

    if (!trimmed) continue
    const eq = trimmed.indexOf('=')

    if (eq === -1) continue
    const k = trimmed.slice(0, eq).trim()

    if (k !== name) continue
    const v = trimmed.slice(eq + 1)
    try {
      return decodeURIComponent(v)
    } catch {
      return v
    }
  }

  return null
}

/** Client-only convenience helper (safe to import anywhere). */
export function getClientLocaleFromCookie(): AppLocale {
  const v = readCookie(LOCALE_COOKIE_NAME)

  return coerceLocale(v) ?? getDefaultLocale()
}
