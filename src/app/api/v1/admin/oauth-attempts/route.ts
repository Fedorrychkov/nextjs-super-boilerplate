import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { listOAuthAttempts } from '@lib/services/oauth-attempt.service'
import { NextRequest, NextResponse } from 'next/server'

import type { OAuthAttemptFilter } from '~/api/oauth/types'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const params = request.nextUrl.searchParams
    const filter: OAuthAttemptFilter = {
      limit: params.get('limit') ? Number(params.get('limit')) : undefined,
      offset: params.get('offset') ? Number(params.get('offset')) : undefined,
      provider: params.get('provider') ?? undefined,
      flow: params.get('flow') ?? undefined,
      outcome: params.get('outcome') ?? undefined,
      collisionUserId: params.get('collisionUserId') ?? undefined,
      actorUserId: params.get('actorUserId') ?? undefined,
      userId: params.get('userId') ?? undefined,
      providerEmail: params.get('providerEmail') ?? undefined,
      startOfDateIso: params.get('startOfDateIso') ?? undefined,
      endOfDateIso: params.get('endOfDateIso') ?? undefined,
    }

    const data = await listOAuthAttempts(filter)

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
