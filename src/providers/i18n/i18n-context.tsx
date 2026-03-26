'use client'

import { createContext } from 'react'

import type { AppLocale } from '~/lib/i18n/config'
import type { TFunction } from '~/lib/i18n/getT'

export type I18nContextValue = {
  locale: AppLocale
  t: TFunction
}

export const I18nContext = createContext<I18nContextValue | null>(null)
