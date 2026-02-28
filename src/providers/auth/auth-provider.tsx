'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { useProfileQuery, useRefreshTokenQuery } from '~/query/auth'

import { AuthUserContext } from './useAuth'

const expectedRoutes = ['/login', '/logout', '/refresh']

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    queueMicrotask(() => setIsClient(true))
  }, [])

  const pathname = usePathname()

  const isEnabled = !expectedRoutes.includes(pathname) && isClient

  const { data: profile, isLoading, refetch, isFetched } = useProfileQuery(isEnabled)

  useEffect(() => {
    if (isEnabled && !isFetched) {
      refetch()
    }
  }, [isEnabled, isFetched, refetch])

  /**
   * Если пользователь авторизован, то обновляем токен каждые 5 минут
   */
  useRefreshTokenQuery(!!profile?.id && isEnabled)

  const values = useMemo(() => {
    return {
      authUser: profile ?? null,
      isLoading: isLoading || !isClient,
      isFetched,
      isAdmin: ['admin'].includes(profile?.role ?? ''),
      role: profile?.role ?? null,
      refetch: async () => refetch(),
      isClient,
    }
  }, [profile, isLoading, isFetched, isClient, refetch])

  return <AuthUserContext.Provider value={values}>{children}</AuthUserContext.Provider>
}
