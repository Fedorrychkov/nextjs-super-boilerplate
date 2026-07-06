import { API_TOKENS_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { listMachineAccessUsers } from '@lib/services/machine-access.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

/** Admin overview: every user with machine access (tokens/grants) + usage windows + block state. */
const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (!API_TOKENS_CONFIG.enabled) {
      return NextResponse.json({ message: t('apiTokens.errors.disabled') }, { status: 404 })
    }

    if (authResult.payload.role !== UserRole.ADMIN) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const params = request.nextUrl.searchParams

    const data = await listMachineAccessUsers({
      limit: params.get('limit') ? Number(params.get('limit')) : undefined,
      offset: params.get('offset') ? Number(params.get('offset')) : undefined,
    })

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
