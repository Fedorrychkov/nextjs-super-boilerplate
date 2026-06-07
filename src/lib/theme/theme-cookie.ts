import { parseThemePreference, THEME_COOKIE_NAME, type ThemePreference } from './config'

export { THEME_COOKIE_NAME }

export function readThemePreferenceCookie(): ThemePreference | null {
  if (typeof document === 'undefined') {
    return null
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE_NAME}=([^;]*)`))
  const raw = match?.[1] ? decodeURIComponent(match[1]) : null

  return parseThemePreference(raw)
}

export function writeThemePreferenceCookie(value: ThemePreference): void {
  if (typeof document === 'undefined') {
    return
  }

  const maxAgeSec = 365 * 24 * 60 * 60
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''

  document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`
}

export function parseThemeCookieValue(raw: string | undefined): ThemePreference | null {
  return parseThemePreference(raw ?? null)
}
