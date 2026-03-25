import { clearAuthCookies } from '@lib/cookies'
import { decodeToken } from '@lib/jwt/utils'
import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { authService } from '@lib/services/auth.service'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

import { getServerTFromNextRequest } from '~/lib/i18n'

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, _req) => {
    const { t } = getServerTFromNextRequest(request)

    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value ?? null

    if (refreshToken) {
      const payload = decodeToken(refreshToken)

      if (payload?.sub) {
        await authService.logout(refreshToken, payload.sub)
      }
    }

    const response = res.json({ success: true, message: t('auth.messages.loggedOutSuccessfully') }, { status: 200 })
    clearAuthCookies(response)

    return response
  })
}

export const POST = withGlobalRateLimit(handler)
