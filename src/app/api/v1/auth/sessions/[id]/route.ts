import { ACCOUNT_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { assertSessionsEnabled, findCurrentSessionId, revokeUserSession } from '@lib/services/user-session.service'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handlerDelete = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (!ACCOUNT_CONFIG.sessionsEnabled) {
      return response.json({ ok: false, error: t('user.sessions.errors.featureDisabled') }, { status: 404 })
    }

    assertSessionsEnabled()

    const paramsData = context ? await context.params : undefined
    const rawId = paramsData?.id
    const sessionId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    if (!sessionId) {
      return response.json({ ok: false, error: t('user.sessions.errors.invalidParams') }, { status: 400 })
    }

    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value ?? null
    const currentSessionId = (await findCurrentSessionId(refreshToken)) ?? authResult.payload.sid ?? null

    if (currentSessionId && sessionId === currentSessionId) {
      return response.json({ ok: false, error: t('user.sessions.errors.cannotRevokeCurrent') }, { status: 400 })
    }

    const revoked = await revokeUserSession(authResult.payload.sub, sessionId)

    if (!revoked) {
      return response.json({ ok: false, error: t('user.sessions.errors.notFound') }, { status: 404 })
    }

    return response.json({ ok: true })
  })

export const DELETE = withGlobalRateLimit(withAuthMiddleware(handlerDelete))
