import type { IncomingHttpHeaders } from 'node:http'

import { type ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'

import { type AppLocale, coerceLocale, getDefaultLocale, LOCALE_COOKIE_NAME, SUPPORTED_LOCALES, type SystemLocale } from './config'

type AcceptLangPref = { tag: string; q: number; order: number }

function parseAcceptLanguageWithQ(headerValue: string | null | undefined): AcceptLangPref[] {
  if (!headerValue) return []

  const entries: AcceptLangPref[] = []
  let order = 0

  for (const part of headerValue.split(',')) {
    const trimmed = part.trim()

    if (!trimmed) continue

    const segments = trimmed.split(';').map((s) => s.trim())
    const langTag = segments[0]

    if (!langTag) continue

    let q = 1

    for (let i = 1; i < segments.length; i++) {
      const s = segments[i]

      if (s.toLowerCase().startsWith('q=')) {
        const num = Number.parseFloat(s.slice(2))

        if (Number.isFinite(num)) {
          q = Math.min(1, Math.max(0, num))
        }
      }
    }

    entries.push({ tag: langTag, q, order })
    order += 1
  }

  entries.sort((a, b) => {
    if (b.q !== a.q) return b.q - a.q

    return a.order - b.order
  })

  return entries
}

/** Language tags in preference order (sorted by `q`, then header order). */
export function parseAcceptLanguage(headerValue: string | null | undefined): string[] {
  return parseAcceptLanguageWithQ(headerValue).map((e) => e.tag)
}

function fileBackedLocaleCodeSet(): ReadonlySet<string> {
  return new Set(SUPPORTED_LOCALES.map((c) => c.toLowerCase()))
}

/**
 * Active DB locale codes plus file-backed `SUPPORTED_LOCALES`. Used by async server detection.
 */
export async function loadMergedResolvableLocaleCodes(): Promise<ReadonlySet<string>> {
  const { I18nService } = await import('@lib/services/i18n.service')

  return new I18nService().getResolvableLocaleCodesForDetection()
}

function pickFirstResolvableLocaleFromAcceptLanguage(headerValue: string | null | undefined, allowed: ReadonlySet<string>): AppLocale | null {
  for (const tag of parseAcceptLanguage(headerValue)) {
    const lower = tag.trim().toLowerCase()

    if (!lower) continue

    if (allowed.has(lower)) {
      const loc = coerceLocale(lower)

      if (loc) return loc
    }

    const primary = lower.split('-')[0] ?? ''

    if (primary && allowed.has(primary)) {
      const loc = coerceLocale(primary)

      if (loc) return loc
    }
  }

  return null
}

export type DetectLocaleFromRequestOpts = {
  cookieLocale?: string | null
  acceptLanguage?: string | null
  /**
   * Lowercased locale codes from `SUPPORTED_LOCALES` ∪ active `I18nLocale` rows.
   * When omitted, only file-backed `SUPPORTED_LOCALES` are accepted (sync / no-DB paths).
   */
  allowedLocaleCodes?: ReadonlySet<string> | null
}

export function detectLocaleFromRequest(opts: DetectLocaleFromRequestOpts): AppLocale {
  const allowed = opts.allowedLocaleCodes ?? fileBackedLocaleCodeSet()

  const rawCookie = opts.cookieLocale

  if (rawCookie) {
    const trimmed = rawCookie.trim()

    if (trimmed) {
      const lower = trimmed.toLowerCase()

      if (allowed.has(lower)) {
        const loc = coerceLocale(trimmed)

        if (loc) return loc
      }
    }
  }

  const fromHeader = pickFirstResolvableLocaleFromAcceptLanguage(opts.acceptLanguage, allowed)

  if (fromHeader) return fromHeader

  return getDefaultLocale()
}

export function getPreferredLanguageCodeFromAcceptLanguage(headerValue: string | null | undefined): string | null {
  const prefs = parseAcceptLanguageWithQ(headerValue)

  if (!prefs.length) {
    return null
  }

  return prefs[0]?.tag ?? null
}

export function detectLocaleFromCookie(cookieValue: string | null | undefined): AppLocale | null {
  return coerceLocale(cookieValue)
}

export async function detectLocaleFromNextCookiesAndHeaders(opts: { cookies: ReadonlyRequestCookies; headers: Headers }): Promise<AppLocale> {
  const allowed = await loadMergedResolvableLocaleCodes()

  return detectLocaleFromRequest({
    cookieLocale: opts.cookies.get(LOCALE_COOKIE_NAME)?.value ?? null,
    acceptLanguage: opts.headers.get('accept-language'),
    allowedLocaleCodes: allowed,
  })
}

/** Node-style headers (no async DB): only `SUPPORTED_LOCALES` gate Accept-Language / cookie. */
export function detectLocaleFromNodeHeaders(headers: IncomingHttpHeaders): AppLocale {
  const cookieHeader = headers.cookie ?? ''
  const cookieLocale = (() => {
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
    allowedLocaleCodes: fileBackedLocaleCodeSet(),
  })
}

export function getSupportedLocales(): readonly SystemLocale[] {
  return SUPPORTED_LOCALES
}
