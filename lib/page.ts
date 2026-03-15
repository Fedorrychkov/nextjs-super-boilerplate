import { APP_INTERNAL_ORIGIN } from '@config/env'
import { AxiosError } from 'axios'
import { cookies, headers } from 'next/headers'
import { redirect, RedirectType } from 'next/navigation'

import { ClientAuthApi } from '~/api/auth'
import { UserRole } from '~/api/user'
import { routes } from '~/constants'
import { Logger } from '~/utils/logger'

import { getAxiosHeaders } from './getAxiosHeaders'

export type PageProps<T extends Record<string, unknown> | undefined = undefined> = {
  params: Promise<T>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export type PageCheckAuthProps<T extends Record<string, unknown> | undefined = undefined> = PageProps<T> & {
  /**
   * Redirect to this path when tokens are missing
   */
  navigatePath?: string
  /**
   * Redirect to this path when user has no access to the page
   * TODO: refactor URL passthrough for page access based on role denial
   */
  fallbackNavigatePath?: string
  fallbackRolesNavigatePath?: {
    [key in UserRole]?: string
  }
  roles?: UserRole[]
  segments?: string[]
}

const buildPathnameBySegments = (segments?: string[], params?: Record<string, unknown>): string => {
  if (!segments) {
    return '/'
  }

  const fullPath = Object.entries(params || {}).reduce((acc, [key, value]) => {
    return acc.replace(`[${key}]`, value as string)
  }, segments.join('/'))

  return fullPath
}

/**
 * Default guard for pages. server side
 * @param props - Page props
 * @returns true if user is authenticated, false otherwise
 */
export const defaultGuard = async <T extends Record<string, unknown> | undefined = undefined>(props: PageCheckAuthProps<T>): Promise<boolean> => {
  const { navigatePath = '/login', fallbackNavigatePath = '/', fallbackRolesNavigatePath = {}, roles, segments, params: paramsPromise } = props

  const logger = new Logger(['defaultGuard', '[lib/page.ts]'])

  const params = await paramsPromise

  const headersStore = await headers()

  const cookieStore = await cookies()

  const accessToken = cookieStore.get('accessToken')
  const refreshToken = cookieStore.get('refreshToken')

  const host = headersStore.get('host') || ''
  const protocol = headersStore.get('x-forwarded-proto') || 'http'
  const origin = `${protocol}://${host}`
  // Use internal origin for server-side API calls when set (e.g. Docker: public hostname may be unresolvable → EAI_AGAIN)
  const apiOrigin = APP_INTERNAL_ORIGIN || origin
  const path = buildPathnameBySegments(segments, params)

  const url = new URL(`${origin}/${path ? `${path === '/' ? '' : path}` : ''}`)
  const pathname = url.pathname
  const cleanPathname = pathname && pathname !== '//' ? pathname : '/'

  const nextPath = `${cleanPathname}`

  logger.debug('defaultGuard Start', {
    accessToken: !!accessToken,
    refreshToken: !!refreshToken,
    navigatePath,
    fallbackNavigatePath,
    roles,
    segments,
    params,
    nextPath,
  })

  const api = new ClientAuthApi(apiOrigin)

  try {
    if (!accessToken && !refreshToken) {
      const cleanNavigatePath = navigatePath && navigatePath !== '//' ? navigatePath : routes.login.path

      return redirect(`${cleanNavigatePath}?nextPath=${cleanPathname}`, RedirectType.replace)
    }

    const newHeaders = getAxiosHeaders({ ...Object.fromEntries(headersStore) })

    try {
      if (!accessToken) {
        throw new Error('No access token, try to refresh')
      }

      const { user } = await api.verifyToken(newHeaders, accessToken.value)

      if (roles && !roles.includes(user.role)) {
        logger.info('defaultGuard redirect to fallbackNavigatePath to / main page')

        const finalPath = fallbackRolesNavigatePath?.[user.role] || fallbackNavigatePath

        return redirect(finalPath, RedirectType.replace)
      }

      return true
    } catch (error) {
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error // Re-throw for Next.js
      }

      logger.info('defaultGuard error follback to refresh verifyToken', error, nextPath)

      if (refreshToken) {
        try {
          await api.verifyToken(newHeaders, refreshToken.value)

          logger.info('defaultGuard redirect to refresh', nextPath, nextPath)

          return redirect(`/refresh?nextPath=${nextPath}`, RedirectType.replace)
        } catch (error: unknown) {
          if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
            throw error
          }

          if (error instanceof AxiosError) {
            logger.info('defaultGuard error verifyToken, redirect to logout', error.response?.data, nextPath)
          } else {
            logger.info('defaultGuard error verifyToken, redirect to logout', error, nextPath)
          }

          return redirect(`/logout?nextPath=${nextPath}`, RedirectType.replace)
        }
      }

      logger.info('defaultGuard redirect to logout', nextPath)

      return redirect(`/logout?nextPath=${nextPath}`, RedirectType.replace)
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error // Re-throw for Next.js
    }

    if (error instanceof AxiosError) {
      logger.error('defaultGuard error global', error.response?.data, nextPath)
    } else {
      logger.error('defaultGuard error global', error, nextPath)
    }

    return false
  }
}
