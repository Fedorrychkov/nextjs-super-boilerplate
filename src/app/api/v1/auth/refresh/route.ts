import { clearAuthCookies, setAuthCookies } from '@lib/cookies'
import { apiErrorHandlerContainer } from '@lib/error/api-error-handler'
import { withGlobalRateLimit } from '@lib/rate-limit'
import { authService } from '@lib/services/auth.service'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res) => {
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value ?? null

    if (!refreshToken) {
      const response = res.json({ message: 'Refresh token not found' }, { status: 401 })
      clearAuthCookies(response)

      return response
    }

    try {
      const authResponse = await authService.refreshTokens(refreshToken)

      const response = res.json(
        {
          success: 'Token refreshed successfully',
          user: authResponse.user,
        },
        { status: 200 },
      )

      setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken, authResponse.expiresIn)

      return response
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to refresh token'
      const response = res.json({ message }, { status: 401 })
      clearAuthCookies(response)

      return response
    }
  })
}

export const POST = withGlobalRateLimit(handler)
