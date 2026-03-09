import { setAuthCookies } from '@lib/cookies'
import { apiErrorHandlerContainer } from '@lib/error/api-error-handler'
import { withGlobalRateLimit } from '@lib/rate-limit'
import { authService } from '@lib/services/auth.service'
import { NextRequest } from 'next/server'

import { RegisterDto } from '~/api/auth/types'

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const body: RegisterDto = await req.json()

    const authResponse = await authService.register(body)

    const response = res.json(
      {
        success: true,
        message: 'User registered successfully',
        user: authResponse.user,
      },
      { status: 201 },
    )

    setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken, authResponse.expiresIn)

    return response
  })
}

export const POST = withGlobalRateLimit(handler)
