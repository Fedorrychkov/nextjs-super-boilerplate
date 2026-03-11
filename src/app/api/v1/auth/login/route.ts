/* eslint-disable simple-import-sort/imports */
import { NextRequest } from 'next/server'

import { setAuthCookies } from '@lib/cookies'
import { apiErrorHandlerContainer } from '@lib/error/api-error-handler'
import { getClientKey, withGlobalRateLimit } from '@lib/rate-limit'
import { assertLoginNotBlocked, recordLoginFailure } from '@lib/security/bruteforce'
import { authService } from '@lib/services/auth.service'

import { LoginEmailDto } from '~/api/auth/types'

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const body: LoginEmailDto = await req.json()
    const ip = getClientKey(req)

    await assertLoginNotBlocked(ip, body.email)

    try {
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
    } catch (error) {
      await recordLoginFailure(ip, body.email)

      throw error
    }
  })
}

export const POST = withGlobalRateLimit(handler)
