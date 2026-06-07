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

/** Optional Elastic template for password change / forgot. Empty string → send plain `text` from i18n only. */
export function resolvePasswordEmailTemplateName(purpose: 'change' | 'forgot', locale?: string | null): string {
  const isRu = isRussianEmailLocale(locale)

  if (purpose === 'change') {
    return (isRu ? EMAIL_CONFIG.templatePasswordChangeRu : EMAIL_CONFIG.templatePasswordChangeEn) ?? ''
  }

  return (isRu ? EMAIL_CONFIG.templatePasswordForgotRu : EMAIL_CONFIG.templatePasswordForgotEn) ?? ''
}
