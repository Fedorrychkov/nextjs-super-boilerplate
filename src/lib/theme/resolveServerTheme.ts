import type { IncomingHttpHeaders } from 'node:http'

import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

import { getEnvDefaultResolvedTheme, type ResolvedTheme, resolveThemeFromPreference, type ThemePreference } from './config'
import { parseThemeCookieValue, THEME_COOKIE_NAME } from './theme-cookie'

export type ServerThemeState = {
  preference: ThemePreference
  resolved: ResolvedTheme
}

const readSystemHintFromHeaders = (headers: ReadonlyHeaders | IncomingHttpHeaders): ResolvedTheme | null => {
  const getHeader = (name: string): string | null => {
    if ('get' in headers && typeof headers.get === 'function') {
      return headers.get(name)
    }

    const record = headers as IncomingHttpHeaders
    const value = record[name] ?? record[name.toLowerCase()]

    return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
  }

  const secCh = getHeader('sec-ch-prefers-color-scheme')?.trim().toLowerCase()

  if (secCh === 'dark' || secCh === 'light') {
    return secCh
  }

  const accept = getHeader('accept')?.toLowerCase() ?? ''

  if (accept.includes('prefers-color-scheme: dark')) {
    return 'dark'
  }

  if (accept.includes('prefers-color-scheme: light')) {
    return 'light'
  }

  return null
}

export async function resolveServerTheme(input: { cookies: ReadonlyRequestCookies; headers: ReadonlyHeaders }): Promise<ServerThemeState> {
  const stored = parseThemeCookieValue(input.cookies.get(THEME_COOKIE_NAME)?.value)
  const systemHint = readSystemHintFromHeaders(input.headers)

  return resolveThemeFromPreference(stored, systemHint ?? getEnvDefaultResolvedTheme())
}
