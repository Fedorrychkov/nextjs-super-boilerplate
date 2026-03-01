'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { UserRole } from '~/api/user'
import { routes } from '~/constants'
import { useProfileQuery, useRefreshTokenQuery } from '~/query/auth'
import { logger } from '~/utils/logger'

import { AuthUserContext } from './useAuth'

const expectedRoutes = [routes.home.path, routes.login.path, routes.logout.path, routes.refresh.path, routes.uiKit.path]

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    queueMicrotask(() => setIsClient(true))
  }, [])

  const pathname = usePathname()

  const isEnabled = !expectedRoutes.includes(pathname) && isClient

  const { data: profile, isLoading, refetch, isFetched } = useProfileQuery(isEnabled)

  logger.info('AuthProvider profile', { profile, isEnabled, isFetched, isLoading, pathname })

  useEffect(() => {
    if (isEnabled && !isFetched) {
      refetch()
    }
  }, [isEnabled, isFetched, refetch])

  /**
   * When user is authenticated, refresh token every 5 minutes
   */
  useRefreshTokenQuery(!!profile?.id && isEnabled)

  const values = useMemo(() => {
    return {
      authUser: profile ?? null,
      isLoading: isEnabled ? isLoading || !isClient : !isClient,
      isFetched: isEnabled ? isFetched : true,
      isAdmin: profile?.role ? [UserRole.ADMIN].includes(profile?.role) : false,
      role: profile?.role ? profile?.role : null,
      refetch: async () => refetch(),
      isClient,
    }
  }, [profile, isLoading, isFetched, isClient, refetch, isEnabled])

  return <AuthUserContext.Provider value={values}>{children}</AuthUserContext.Provider>
}
