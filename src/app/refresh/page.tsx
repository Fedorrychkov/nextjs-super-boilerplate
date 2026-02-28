'use client'

import { redirect, RedirectType, useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

import { SpinnerScreen } from '~/components/Loaders'
import { routes } from '~/constants'
import { useRefreshTokenQuery } from '~/query/auth'
import { logger } from '~/utils/logger'

const RefreshWithParams = () => {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('nextPath')

  const { data, error } = useRefreshTokenQuery(true)

  logger.info('RefreshWithParams', {
    data,
    error,
    nextPath,
  })

  useEffect(() => {
    if (data) {
      const cleanNextPath = nextPath && nextPath !== '//' ? nextPath : routes.home.path
      logger.info('RefreshWithParams cleanNextPath', cleanNextPath)
      redirect(cleanNextPath, RedirectType.replace)
    } else if (error) {
      logger.error('RefreshWithParams error', error)

      redirect('/login', RedirectType.replace)
    }
  }, [data, nextPath, error])

  return (
    <div className="w-full h-full flex items-center justify-center flex-col flex-1">
      <SpinnerScreen />
    </div>
  )
}

const Refresh = () => {
  logger.info('RefreshScreen')

  return (
    <div className="w-full h-full flex items-center justify-center flex-col flex-1">
      <Suspense fallback={<SpinnerScreen />}>
        <RefreshWithParams />
      </Suspense>
    </div>
  )
}

export default Refresh
