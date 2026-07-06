import { API_TOKENS_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { revokeApiToken } from '@lib/services/api-token.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (!API_TOKENS_CONFIG.enabled) {
      return NextResponse.json({ message: t('apiTokens.errors.disabled') }, { status: 404 })
    }

    const params = await context?.params
    const id = typeof params?.id === 'string' ? params.id : ''

    if (!id) {
      return NextResponse.json({ message: t('apiTokens.errors.notFound') }, { status: 404 })
    }

    // Admin revokes any token; other roles only their own (no policy check — revoking must always work).
    const isAdmin = authResult.payload.role === UserRole.ADMIN

    const data = await revokeApiToken(id, authResult.payload.sub, isAdmin ? undefined : { restrictToOwnerId: authResult.payload.sub })

    if (!data) {
      return NextResponse.json({ message: t('apiTokens.errors.notFound') }, { status: 404 })
    }

    return response.json(data)
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
