import { FIRST_ADMIN_CONFIG } from '@config/env'
import { setAuthCookies } from '@lib/cookies'
import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { ensureCanRegister } from '@lib/security/bruteforce'
import { getClientKey } from '@lib/security/rate-limit'
import { authService } from '@lib/services/auth.service'
import { NextRequest, NextResponse } from 'next/server'

import { RegisterDto } from '~/api/auth/types'
import { getServerTFromNextRequest } from '~/lib/i18n'

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = getServerTFromNextRequest(request)

    const body: RegisterDto = await req.json()
    const ip = getClientKey(req)
    await ensureCanRegister(ip)

    const email = body.email
    const password = body.password

    /**
     * If the email is the first admin and the password is not the first admin password, return an error
     * This is to prevent the first admin from being able to register other admins
     */
    if (email === FIRST_ADMIN_CONFIG.login && password !== FIRST_ADMIN_CONFIG.password) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const isValidAdmin = email === FIRST_ADMIN_CONFIG.login && password === FIRST_ADMIN_CONFIG.password

    const authResponse = await authService.register(body, isValidAdmin)

    const response = res.json(
      {
        success: true,
        message: t('user.messages.registeredSuccessfully'),
        user: authResponse.user,
      },
      { status: 201 },
    )

    setAuthCookies(response, authResponse.accessToken, authResponse.refreshToken, authResponse.expiresIn)

    return response
  })
}

export const POST = withGlobalRateLimit(handler)
