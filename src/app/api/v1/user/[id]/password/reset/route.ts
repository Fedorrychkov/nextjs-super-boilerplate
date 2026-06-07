import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { adminSetUserPassword } from '@lib/services/admin-account-recovery.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const body = await request.json()
    const { newPassword } = body || {}

    if (![UserRole.ADMIN].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const paramsData = context ? await context.params : undefined
    const rawId = paramsData?.id
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    if (!id) {
      return NextResponse.json({ message: t('user.errors.idRequired') }, { status: 400 })
    }

    const result = await adminSetUserPassword(
      {
        targetUserId: id,
        adminUserId: authResult.payload.sub,
        newPassword: String(newPassword ?? ''),
      },
      t,
    )

    return response.json(result)
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
