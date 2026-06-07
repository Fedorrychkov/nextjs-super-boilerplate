import { ACCOUNT_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { assertSessionsEnabled, findCurrentSessionId, listUserSessions, revokeOtherUserSessions } from '@lib/services/user-session.service'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handlerGet = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    if (!ACCOUNT_CONFIG.sessionsEnabled) {
      return response.json({ enabled: false, list: [] })
    }

    assertSessionsEnabled()

    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value ?? null
    const currentSessionId = (await findCurrentSessionId(refreshToken)) ?? authResult.payload.sid ?? null
    const list = await listUserSessions(authResult.payload.sub, currentSessionId)

    return response.json({ enabled: true, list })
  })

const handlerDelete = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (!ACCOUNT_CONFIG.sessionsEnabled) {
      return response.json({ ok: false, error: t('user.sessions.errors.featureDisabled') }, { status: 404 })
    }

    assertSessionsEnabled()

    const exceptCurrent = request.nextUrl.searchParams.get('exceptCurrent') === '1'
    const cookieStore = await cookies()
    const refreshToken = cookieStore.get('refreshToken')?.value ?? null
    const currentSessionId = (await findCurrentSessionId(refreshToken)) ?? authResult.payload.sid ?? null

    if (exceptCurrent) {
      const revoked = await revokeOtherUserSessions(authResult.payload.sub, currentSessionId)

      return response.json({ ok: true, revoked })
    }

    return response.json({ ok: false, error: t('user.sessions.errors.invalidParams') }, { status: 400 })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handlerGet))
export const DELETE = withGlobalRateLimit(withAuthMiddleware(handlerDelete))
