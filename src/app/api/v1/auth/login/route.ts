import { setAuthCookies } from '@lib/cookies'
import connectDB from '@lib/db/client'
import UserSettings from '@lib/db/models/UserSettings'
import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { assertLoginNotBlocked, recordLoginFailure } from '@lib/security/bruteforce'
import { createLoginChallenge } from '@lib/security/login-challenge'
import { getClientKey } from '@lib/security/rate-limit'
import { authService } from '@lib/services/auth.service'
import { NextRequest } from 'next/server'

import { LoginEmailDto } from '~/api/auth/types'

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const body: LoginEmailDto = await req.json()
    const ip = getClientKey(req)

    await assertLoginNotBlocked(ip, body.email)

    try {
      const user = await authService.validateUserCredentials(body)

      await connectDB()
      const settings = await UserSettings.findOne({ userId: user._id })

      if (!settings || !settings.mfaEnabled || !settings.mfaSecret) {
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
      }

      const challengeId = await createLoginChallenge(user._id.toString())

      return res.json(
        {
          success: true,
          requiresMfa: true,
          mfaType: 'totp',
          challengeId,
        },
        { status: 200 },
      )
    } catch (error) {
      await recordLoginFailure(ip, body.email)

      throw error
    }
  })
}

export const POST = withGlobalRateLimit(handler)
