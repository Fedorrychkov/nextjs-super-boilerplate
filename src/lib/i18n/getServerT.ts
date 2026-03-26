import { cookies, headers } from 'next/headers'
import type { NextRequest } from 'next/server'

import { type AppLocale, LOCALE_COOKIE_NAME } from './config'
import { detectLocaleFromNextCookiesAndHeaders, detectLocaleFromRequest } from './detectLocale'
import { getT, type TFunction } from './getT'

/**
 * Server-side convenience helper.
 *
 * Uses Next's `cookies()`/`headers()` (async in Next 16) to detect locale and returns `t`.
 * Safe to call in Server Components, Layouts, and Route Handlers.
 */
export async function getServerT(): Promise<{ locale: AppLocale; t: TFunction }> {
  const locale = detectLocaleFromNextCookiesAndHeaders({
    cookies: await cookies(),
    headers: await headers(),
  })

  return { locale, t: getT(locale) }
}

/**
 * Route-handler convenience helper when you already have `NextRequest`.
 */
export function getServerTFromNextRequest(req: NextRequest): { locale: AppLocale; t: TFunction } {
  const locale = detectLocaleFromRequest({
    cookieLocale: req.cookies.get(LOCALE_COOKIE_NAME)?.value ?? null,
    acceptLanguage: req.headers.get('accept-language'),
  })

  return { locale, t: getT(locale) }
}
