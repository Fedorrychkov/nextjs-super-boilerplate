'use client'

import { redirect, RedirectType, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

import { SpinnerScreen } from '~/components/Loaders'
import { safeInternalPath, withNextPath } from '~/lib/security/safeInternalPath'
import { useLogoutQuery } from '~/query/auth'
import { Logger } from '~/utils/logger'

const LogoutWithParams = () => {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('nextPath')

  const { data } = useLogoutQuery()

  useEffect(() => {
    if (data) {
      // Validated (no open redirect) and re-encoded: a path with its own query used to be glued
      // in raw and split into stray parameters of the login page.
      const safe = safeInternalPath(nextPath, '')

      redirect(safe ? withNextPath('/login', safe) : '/login', RedirectType.replace)
    }
  }, [data, nextPath])

  return (
    <div className="w-full h-full flex items-center justify-center flex-col flex-1">
      <SpinnerScreen />
    </div>
  )
}

const Logout = () => {
  const logger = new Logger(['Logout', '[src/app/logout/page.tsx]'])

  logger.info('LogoutScreen')

  return (
    <div className="w-full h-full flex items-center justify-center flex-col flex-1">
      <Suspense fallback={<SpinnerScreen />}>
        <LogoutWithParams />
      </Suspense>
    </div>
  )
}

export default Logout
