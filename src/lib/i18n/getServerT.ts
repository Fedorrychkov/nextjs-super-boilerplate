import { cookies, headers } from 'next/headers'
import type { NextRequest } from 'next/server'

import { type AppLocale, LOCALE_COOKIE_NAME } from './config'
import { detectLocaleFromNextCookiesAndHeaders, detectLocaleFromRequest, loadMergedResolvableLocaleCodes } from './detectLocale'
import { getLocaleOverrides } from './getLocaleOverrides'
import { getT, type TFunction } from './getT'

/**
 * Server-side convenience helper.
 *
 * Uses Next's `cookies()`/`headers()` (async in Next 16) to detect locale and returns `t`.
 * Safe to call in Server Components, Layouts, and Route Handlers.
 */
export async function getServerT(): Promise<{ locale: AppLocale; t: TFunction }> {
  const locale = await detectLocaleFromNextCookiesAndHeaders({
    cookies: await cookies(),
    headers: await headers(),
  })
  const overrides = await getLocaleOverrides(locale)

  return { locale, t: getT(locale, overrides) }
}

export async function getServerTFromNextRequestAsync(req: NextRequest): Promise<{ locale: AppLocale; t: TFunction }> {
  const allowed = await loadMergedResolvableLocaleCodes()
  const locale = detectLocaleFromRequest({
    cookieLocale: req.cookies.get(LOCALE_COOKIE_NAME)?.value ?? null,
    acceptLanguage: req.headers.get('accept-language'),
    allowedLocaleCodes: allowed,
  })
  const overrides = await getLocaleOverrides(locale)

  return { locale, t: getT(locale, overrides) }
}
