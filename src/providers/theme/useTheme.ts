'use client'

import { createContext, useContext } from 'react'

import type { ResolvedTheme, ThemePreference } from '~/lib/theme/config'

export type ThemeContextValue = {
  preference: ThemePreference
  resolved: ResolvedTheme
  hydrated: boolean
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)

  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }

  return ctx
}
