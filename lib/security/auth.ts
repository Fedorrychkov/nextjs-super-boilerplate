import { verifyAccessToken } from '@lib/jwt/utils'
import { NextRequest, NextResponse } from 'next/server'

import { JwtPayload } from '~/api/auth/model'
import { UserRole, UserStatus } from '~/api/user'

export interface AuthRequest extends NextRequest {
  user?: JwtPayload
}

/**
 * Authentication check result
 */
export type AuthResult = { success: true; payload: JwtPayload; response: NextResponse } | { success: false; response: NextResponse }

/**
 * Middleware to verify JWT token
 * Returns payload on success or error response on failure
 */
export async function authMiddleware(request: NextRequest): Promise<AuthResult> {
  // Get token from cookies or Authorization header
  const accessToken = request.cookies.get('accessToken')?.value || request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!accessToken) {
    return {
      success: false,
      response: NextResponse.json({ message: 'Authentication required' }, { status: 401 }),
    }
  }

  try {
    const payload = verifyAccessToken(accessToken)

    // Add user to request headers for use in route handlers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.sub)
    requestHeaders.set('x-user-email', payload.email)
    requestHeaders.set('x-user-role', payload.role)

    if (payload.status) {
      requestHeaders.set('x-user-status', payload.status)
    }

    return {
      success: true,
      payload,
      response: NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      }),
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Invalid or expired token'

    return {
      success: false,
      response: NextResponse.json({ message }, { status: 401 }),
    }
  }
}

/**
 * Middleware to check user role
 */
export function roleMiddleware(allowedRoles: UserRole[]) {
  return async (request: NextRequest): Promise<AuthResult> => {
    const authResult = await authMiddleware(request)

    if (!authResult.success) {
      return authResult
    }

    if (!allowedRoles.includes(authResult.payload.role)) {
      return {
        success: false,
        response: NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 }),
      }
    }

    return authResult
  }
}

/**
 * Get user from request headers (after authMiddleware)
 * @deprecated Use payload from authMiddleware result directly
 */
export function getUserFromRequest(request: NextRequest): JwtPayload | null {
  const userId = request.headers.get('x-user-id')
  const email = request.headers.get('x-user-email')
  const role = request.headers.get('x-user-role') as UserRole | null
  const status = request.headers.get('x-user-status')

  if (!userId || !email || !role) {
    return null
  }

  return {
    sub: userId,
    email,
    role,
    status: status as UserStatus,
  }
}
