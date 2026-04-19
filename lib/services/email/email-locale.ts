import { EMAIL_CONFIG } from '@config/env'

/** True for `ru`, `ru-RU`, etc. English is the default for any other tag. */
export function isRussianEmailLocale(locale?: string | null): boolean {
  const n = (locale ?? '').trim().toLowerCase()

  return n === 'ru' || n.startsWith('ru-')
}

/** Elastic template name for sign-up verification (EN vs RU dashboards may use the same name). */
export function resolveVerifyEmailTemplateName(locale?: string | null): string {
  return isRussianEmailLocale(locale) ? (EMAIL_CONFIG.templateVerifyEmailRu ?? '') : (EMAIL_CONFIG.templateVerifyEmailEn ?? '')
}
