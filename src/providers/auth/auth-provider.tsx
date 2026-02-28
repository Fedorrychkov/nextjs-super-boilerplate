'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { useProfileQuery, useRefreshTokenQuery } from '~/query/auth'

import { AuthUserContext } from './useAuth'
import { routes } from '~/constants'
import { UserRole } from '~/api/user'

const expectedRoutes = [routes.home.path, routes.login.path, routes.logout.path, routes.refresh.path, routes.uiKit.path]

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
      isFetched: isEnabled ? isFetched : true,
      isAdmin: profile?.role ? [UserRole.ADMIN].includes(profile?.role) : false,
      role: profile?.role ? profile?.role : null,
      refetch: async () => refetch(),
      isClient,
    }
  }, [profile, isLoading, isFetched, isClient, refetch, isEnabled])

  return <AuthUserContext.Provider value={values}>{children}</AuthUserContext.Provider>
}
