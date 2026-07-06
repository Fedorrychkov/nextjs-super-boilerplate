import { API_TOKENS_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { setMachineAccessBlocked } from '@lib/services/machine-access.service'
import { NextRequest, NextResponse } from 'next/server'

import type { MachineAccessBlockPayload } from '~/api/machine-access'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

/**
 * Per-user machine-access kill-switch (abuse / platform overload). Non-destructive:
 * blocking rejects every PAT/OAuth request instantly, unblocking restores existing
 * tokens and connections untouched.
 */
const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (!API_TOKENS_CONFIG.enabled) {
      return NextResponse.json({ message: t('apiTokens.errors.disabled') }, { status: 404 })
    }

    if (authResult.payload.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const body = (await request.json()) as Partial<MachineAccessBlockPayload>
    const userId = typeof body.userId === 'string' ? body.userId : ''

    // Admins cannot block themselves — avoids locking the platform out of its own tooling by accident.
    if (!userId || userId === authResult.payload.sub) {
      return NextResponse.json({ message: t('errors.badRequest') }, { status: 400 })
    }

    const ok = await setMachineAccessBlocked({ userId, blocked: body.blocked === true, actorUserId: authResult.payload.sub })

    if (!ok) {
      return NextResponse.json({ message: t('errors.notFound') }, { status: 404 })
    }

    return response.json({ userId, blocked: body.blocked === true })
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
