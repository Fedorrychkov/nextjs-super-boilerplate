'use client'

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'

import { type ResolvedTheme, resolveThemeFromPreference, type ThemePreference } from '~/lib/theme/config'
import { readThemePreferenceCookie, writeThemePreferenceCookie } from '~/lib/theme/theme-cookie'

import { ThemeContext, type ThemeContextValue } from './useTheme'

const applyResolvedToDocument = (resolved: ResolvedTheme) => {
  const root = document.documentElement

  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

const readSystemResolved = (): ResolvedTheme => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

type Props = {
  children: ReactNode
  initialPreference: ThemePreference
  initialResolved: ResolvedTheme
}

export function ThemeProvider({ children, initialPreference, initialResolved }: Props) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference)
  const [resolved, setResolved] = useState<ResolvedTheme>(initialResolved)
  const [hydrated, setHydrated] = useState(false)

  const syncFromPreference = useCallback((nextPreference: ThemePreference, persist: boolean) => {
    const systemHint = nextPreference === 'system' ? readSystemResolved() : null
    const next = resolveThemeFromPreference(nextPreference, systemHint)

    setPreferenceState(next.preference)
    setResolved(next.resolved)
    applyResolvedToDocument(next.resolved)

    if (persist) {
      writeThemePreferenceCookie(next.preference)
    }
  }, [])

  useEffect(() => {
    const stored = readThemePreferenceCookie()

    if (stored) {
      queueMicrotask(() => {
        syncFromPreference(stored, false)
      })
    } else {
      queueMicrotask(() => {
        syncFromPreference('system', false)
      })
    }

    queueMicrotask(() => {
      setHydrated(true)
    })
  }, [syncFromPreference])

  useEffect(() => {
    if (preference !== 'system') {
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const onChange = () => {
      const next = resolveThemeFromPreference('system', readSystemResolved())
      setResolved(next.resolved)
      applyResolvedToDocument(next.resolved)
    }

    media.addEventListener('change', onChange)

    return () => media.removeEventListener('change', onChange)
  }, [preference])

  const setPreference = useCallback(
    (next: ThemePreference) => {
      syncFromPreference(next, true)
    },
    [syncFromPreference],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      hydrated,
      setPreference,
    }),
    [hydrated, preference, resolved, setPreference],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
