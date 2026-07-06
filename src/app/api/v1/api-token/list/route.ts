import { API_TOKENS_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { getApiTokenPermissionsForRole, listApiTokens } from '@lib/services/api-token.service'
import { NextRequest, NextResponse } from 'next/server'

import type { ApiTokenFilter } from '~/api/api-token'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (!API_TOKENS_CONFIG.enabled) {
      return NextResponse.json({ message: t('apiTokens.errors.disabled') }, { status: 404 })
    }

    const isAdmin = authResult.payload.role === UserRole.ADMIN

    if (!isAdmin) {
      const permissions = await getApiTokenPermissionsForRole(authResult.payload.role)

      if (!permissions.allowed) {
        return NextResponse.json({ message: t('apiTokens.errors.notAllowedForRole') }, { status: 403 })
      }
    }

    const params = request.nextUrl.searchParams
    const filter: ApiTokenFilter = {
      limit: params.get('limit') ? Number(params.get('limit')) : undefined,
      offset: params.get('offset') ? Number(params.get('offset')) : undefined,
      status: params.get('status') ?? undefined,
      // Admin sees every token; everyone else only their own.
      ownerUserId: isAdmin ? undefined : authResult.payload.sub,
    }

    const data = await listApiTokens(filter)

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
