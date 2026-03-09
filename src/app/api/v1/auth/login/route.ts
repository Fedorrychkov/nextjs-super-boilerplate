/* eslint-disable simple-import-sort/imports */
import { NextRequest } from 'next/server'

import { setAuthCookies } from '@lib/cookies'
import { apiErrorHandlerContainer } from '@lib/error/api-error-handler'
import { withGlobalRateLimit } from '@lib/rate-limit'
import { authService } from '@lib/services/auth.service'

import { LoginEmailDto } from '~/api/auth/types'

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const body: LoginEmailDto = await req.json()

    const authResponse = await authService.login(body)

    const response = res.json(
      {
        success: true,
        user: authResponse.user,
      },
      { status: 200 },
    )

    setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken, authResponse.expiresIn)

    return response
  })
}

export const POST = withGlobalRateLimit(handler)
