import { ACCOUNT_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { assertSessionsEnabled, revokeUserSession } from '@lib/services/user-session.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handlerDelete = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
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
    const rawUserId = paramsData?.userId
    const userId = typeof rawUserId === 'string' ? rawUserId : Array.isArray(rawUserId) ? rawUserId[0] : undefined
    const rawSessionId = paramsData?.sessionId
    const sessionId = typeof rawSessionId === 'string' ? rawSessionId : Array.isArray(rawSessionId) ? rawSessionId[0] : undefined

    if (!userId || !sessionId) {
      return response.json({ ok: false, error: t('user.sessions.errors.invalidParams') }, { status: 400 })
    }

    const revoked = await revokeUserSession(userId, sessionId)

    if (!revoked) {
      return response.json({ ok: false, error: t('user.sessions.errors.notFound') }, { status: 404 })
    }

    return response.json({ ok: true })
  })

export const DELETE = withGlobalRateLimit(withAuthMiddleware(handlerDelete))
