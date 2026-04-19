import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { ensureCanRegister } from '@lib/security/bruteforce'
import { getClientKey } from '@lib/security/rate-limit'
import { authService } from '@lib/services/auth.service'
import { NextRequest, NextResponse } from 'next/server'

import { RegisterByAdminDto } from '~/api/auth/types'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequest } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const body: RegisterByAdminDto = await req.json()
    const ip = getClientKey(req)
    await ensureCanRegister(ip)

    const authResponse = await authService.registerByAdmin(body, t)

    const response = res.json(
      {
        success: true,
        message: t('user.messages.registeredSuccessfully'),
        user: authResponse,
      },
      { status: 201 },
    )

    return response
  })
}

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
