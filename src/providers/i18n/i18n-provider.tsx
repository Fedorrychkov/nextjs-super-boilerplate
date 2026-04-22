'use client'

import { type ReactNode, useMemo } from 'react'

import type { AppLocale } from '~/lib/i18n/config'
import { getT } from '~/lib/i18n/getT'

import { I18nContext } from './i18n-context'

export function I18nProvider({ locale, children, overrides }: { locale: AppLocale; children: ReactNode; overrides?: Record<string, string> }) {
  const t = useMemo(() => getT(locale, overrides), [locale, overrides])
  const value = useMemo(() => ({ locale, t }), [locale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
