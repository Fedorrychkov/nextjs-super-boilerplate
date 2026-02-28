'use client'

import { redirect, RedirectType, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

import { SpinnerScreen } from '~/components/Loaders'
import { useLogoutQuery } from '~/query/auth'
import { logger } from '~/utils/logger'

const LogoutWithParams = () => {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('nextPath')

  const { data } = useLogoutQuery()

  useEffect(() => {
    if (data) {
      redirect(`/login${nextPath ? `?nextPath=${nextPath}` : ''}`, RedirectType.replace)
    }
  }, [data, nextPath])

  return (
    <div className="w-full h-full flex items-center justify-center flex-col flex-1">
      <SpinnerScreen />
    </div>
  )
}

const Logout = () => {
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
