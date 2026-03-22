import { authMiddleware, AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Context argument for route handler in App Router (Next 15+): `{ params: Promise<...> }` for dynamic segments.
 */
export type RouteHandlerContext = {
  params: Promise<Record<string, string | string[]>>
}

type AuthHandler = (
  request: NextRequest,
  auth: AuthSuccessResult,
  /** The second argument of the route handler is always passed from `withAuthMiddleware` */
  context?: RouteHandlerContext,
) => Promise<NextResponse>

export const withAuthMiddleware = (handler: AuthHandler): ((request: NextRequest, context: RouteHandlerContext) => Promise<NextResponse>) => {
  return async (request: NextRequest, context: RouteHandlerContext) => {
    const authResult = await authMiddleware(request)

    if (!authResult.success) {
      return authResult.response
    }

    return handler(request, authResult, context)
  }
}
