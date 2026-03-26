'use client'

import { useContext } from 'react'

import { I18nContext } from './i18n-context'

export function useT() {
  const ctx = useContext(I18nContext)

  if (!ctx) throw new Error('useT must be used within I18nProvider')

  return ctx.t
}
