'use client'

import { useContext } from 'react'

import { I18nContext } from './i18n-context'

export function useLocale() {
  const ctx = useContext(I18nContext)

  if (!ctx) throw new Error('useLocale must be used within I18nProvider')

  return ctx.locale
}
