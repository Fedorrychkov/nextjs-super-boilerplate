export const THEME_COOKIE_NAME = 'sb_theme_mode'

/** User preference stored in cookie. */
export type ThemePreference = 'light' | 'dark' | 'system'

/** Resolved palette applied to `<html class="dark">`. */
export type ResolvedTheme = 'light' | 'dark'

const THEME_PREFERENCES: ThemePreference[] = ['light', 'dark', 'system']

export const parseThemePreference = (raw: string | null | undefined): ThemePreference | null => {
  if (!raw) return null

  const value = raw.trim().toLowerCase()

  if (THEME_PREFERENCES.includes(value as ThemePreference)) {
    return value as ThemePreference
  }

  return null
}

/** Env default when OS preference is unknown on the server (`DEFAULT_THEME_MODE`, fallback `dark`). */
export const getEnvDefaultResolvedTheme = (): ResolvedTheme => {
  const raw = (process.env.DEFAULT_THEME_MODE ?? process.env.NEXT_PUBLIC_DEFAULT_THEME_MODE ?? 'dark').trim().toLowerCase()

  return raw === 'light' ? 'light' : 'dark'
}

export const getClientEnvDefaultResolvedTheme = (): ResolvedTheme => {
  const raw = (process.env.NEXT_PUBLIC_DEFAULT_THEME_MODE ?? 'dark').trim().toLowerCase()

  return raw === 'light' ? 'light' : 'dark'
}

export const resolveThemeFromPreference = (
  preference: ThemePreference | null,
  systemHint: ResolvedTheme | null,
): { preference: ThemePreference; resolved: ResolvedTheme } => {
  const effectivePreference: ThemePreference = preference ?? 'system'

  if (effectivePreference === 'light') {
    return { preference: effectivePreference, resolved: 'light' }
  }

  if (effectivePreference === 'dark') {
    return { preference: effectivePreference, resolved: 'dark' }
  }

  return {
    preference: 'system',
    resolved: systemHint ?? getEnvDefaultResolvedTheme(),
  }
}
