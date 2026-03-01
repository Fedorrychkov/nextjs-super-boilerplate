import { isDevelop } from '@config/env'
import type { GetServerSidePropsContext, NextApiResponse } from 'next'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export interface CookieOptions {
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  path?: string
  maxAge?: number
  domain?: string
}

/**
 * Setting auth cookies through NextResponse (for App Router)
 */
export function setAuthCookies(response: NextResponse, accessToken: string, refreshToken: string, expiresIn: number): void {
  const secure = !isDevelop
  const sameSite = 'lax'

  // Access token cookie
  response.cookies.set('accessToken', accessToken, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: expiresIn,
  })

  // Refresh token cookie
  const refreshExpiresIn = 7 * 24 * 60 * 60 // 7 days in seconds
  response.cookies.set('refreshToken', refreshToken, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: refreshExpiresIn,
  })

  // Token expiration time cookie
  response.cookies.set('tokenExpiresIn', expiresIn.toString(), {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: expiresIn,
  })
}

/**
 * Clearing all auth cookies through NextResponse (for App Router)
 */
export function clearAuthCookies(response: NextResponse): void {
  const secure = !isDevelop
  const sameSite = isDevelop ? 'lax' : 'none'

  response.cookies.set('accessToken', '', {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 0,
  })

  response.cookies.set('refreshToken', '', {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 0,
  })

  response.cookies.set('tokenExpiresIn', '', {
    httpOnly: true,
    secure,
    sameSite,
    path: '/',
    maxAge: 0,
  })
}

/**
 * Clearing all auth cookies (for Pages Router - backward compatibility)
 */
export const clearAllAuthCookies = (res: NextApiResponse | GetServerSidePropsContext['res']) => {
  const secure = !isDevelop
  const secureFlag = secure ? '; Secure' : ''

  res.setHeader('Set-Cookie', [
    `accessToken=; HttpOnly; Path=/; SameSite=None; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`,
    `refreshToken=; HttpOnly; Path=/; SameSite=None; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`,
    `tokenExpiresIn=; HttpOnly; Path=/; SameSite=None; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secureFlag}`,
  ])
}

/**
 * Getting the token from cookies (for server components)
 */
export async function getAccessTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()

  return cookieStore.get('accessToken')?.value || null
}

/**
 * Getting the refresh token from cookies (for server components)
 */
export async function getRefreshTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies()

  return cookieStore.get('refreshToken')?.value || null
}
