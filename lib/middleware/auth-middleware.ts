import { authMiddleware, AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

type AuthHandler = (request: NextRequest, auth: AuthSuccessResult) => Promise<NextResponse>

export const withAuthMiddleware = (handler: AuthHandler): ((request: NextRequest) => Promise<NextResponse>) => {
  return async (request: NextRequest) => {
    const authResult = await authMiddleware(request)

    if (!authResult.success) {
      return authResult.response
    }

    return handler(request, authResult)
  }
}
