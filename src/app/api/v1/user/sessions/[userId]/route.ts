import { ACCOUNT_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { authService } from '@lib/services/auth.service'
import { assertSessionsEnabled, listUserSessionsAdmin } from '@lib/services/user-session.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handlerGet = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    if (!ACCOUNT_CONFIG.sessionsEnabled) {
      return response.json({ enabled: false, list: [] })
    }

    assertSessionsEnabled()

    const paramsData = context ? await context.params : undefined
    const rawId = paramsData?.userId
    const userId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    if (!userId) {
      return NextResponse.json({ message: t('user.errors.idRequired') }, { status: 400 })
    }

    const list = await listUserSessionsAdmin(userId)

    return response.json({ enabled: true, list })
  })

const handlerDeleteAll = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    if (!ACCOUNT_CONFIG.sessionsEnabled) {
      return response.json({ ok: false, error: t('user.sessions.errors.featureDisabled') }, { status: 404 })
    }

    assertSessionsEnabled()

    const paramsData = context ? await context.params : undefined
    const rawId = paramsData?.userId
    const userId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    if (!userId) {
      return NextResponse.json({ message: t('user.errors.idRequired') }, { status: 400 })
    }

    await authService.logoutAll(userId)

    return response.json({ ok: true })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handlerGet))
export const DELETE = withGlobalRateLimit(withAuthMiddleware(handlerDeleteAll))
