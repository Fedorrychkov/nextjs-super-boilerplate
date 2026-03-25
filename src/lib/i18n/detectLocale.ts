import type { IncomingHttpHeaders } from 'node:http'

import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

import { type AppLocale, coerceLocale, getDefaultLocale, LOCALE_COOKIE_NAME, SUPPORTED_LOCALES } from './config'

function parseAcceptLanguage(headerValue: string | null | undefined): string[] {
  if (!headerValue) return []

  // Example: "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
  return headerValue
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.split(';')[0]?.trim())
    .filter(Boolean)
}

function pickSupportedLocaleFromAcceptLanguage(headerValue: string | null | undefined): AppLocale | null {
  const tags = parseAcceptLanguage(headerValue)

  for (const tag of tags) {
    const exact = coerceLocale(tag)

    if (exact) return exact

    const base = tag.split('-')[0]
    const baseLocale = coerceLocale(base)

    if (baseLocale) return baseLocale
  }

  return null
}

export function detectLocaleFromCookie(cookieValue: string | null | undefined): AppLocale | null {
  return coerceLocale(cookieValue)
}

export function detectLocaleFromRequest(opts: { cookieLocale?: string | null; acceptLanguage?: string | null }): AppLocale {
  const fromCookie = detectLocaleFromCookie(opts.cookieLocale)

  if (fromCookie) return fromCookie

  const fromHeader = pickSupportedLocaleFromAcceptLanguage(opts.acceptLanguage)

  if (fromHeader) return fromHeader

  return getDefaultLocale()
}

export function detectLocaleFromNextCookiesAndHeaders(opts: { cookies: ReadonlyRequestCookies; headers: Headers }): AppLocale {
  return detectLocaleFromRequest({
    cookieLocale: opts.cookies.get(LOCALE_COOKIE_NAME)?.value ?? null,
    acceptLanguage: opts.headers.get('accept-language'),
  })
}

export function detectLocaleFromNodeHeaders(headers: IncomingHttpHeaders): AppLocale {
  const cookieHeader = headers.cookie ?? ''
  const cookieLocale = (() => {
    // cheap parse: "a=b; locale=ru; c=d"
    const parts = cookieHeader.split(';')
    for (const p of parts) {
      const [k, ...rest] = p.trim().split('=')

      if (!k) continue

      if (k === LOCALE_COOKIE_NAME) return rest.join('=') || null
    }

    return null
  })()

  return detectLocaleFromRequest({
    cookieLocale,
    acceptLanguage: typeof headers['accept-language'] === 'string' ? headers['accept-language'] : null,
  })
}

export function getSupportedLocales(): readonly AppLocale[] {
  return SUPPORTED_LOCALES
}
