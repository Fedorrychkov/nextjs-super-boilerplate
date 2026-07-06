import { API_TOKENS_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, type RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { getMachineAccessUserDetail } from '@lib/services/machine-access.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

/** Admin drill-down: user's tokens (with usage per token), OAuth grants and recent request events. */
const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (!API_TOKENS_CONFIG.enabled) {
      return NextResponse.json({ message: t('apiTokens.errors.disabled') }, { status: 404 })
    }

    if (authResult.payload.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const params = (await context?.params) as { id?: string } | undefined
    const data = params?.id ? await getMachineAccessUserDetail(params.id) : null

    if (!data) {
      return NextResponse.json({ message: t('errors.notFound') }, { status: 404 })
    }

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
