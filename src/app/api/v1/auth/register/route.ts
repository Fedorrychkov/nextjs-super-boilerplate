import { setAuthCookies } from '@lib/cookies'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { authService } from '@lib/services/auth.service'
import { NextRequest, NextResponse } from 'next/server'

import { RegisterDto } from '~/api/auth/types'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequest } from '~/lib/i18n'

const handler = (request: NextRequest, authResult: AuthSuccessResult) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const body: RegisterDto = await req.json()

    const authResponse = await authService.register(body)

    const response = res.json(
      {
        success: true,
        message: t('user.messages.userRegisteredSuccessfully'),
        user: authResponse.user,
      },
      { status: 201 },
    )

    setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken, authResponse.expiresIn)

    return response
  })
}

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
