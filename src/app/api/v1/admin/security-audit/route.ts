import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { listSecurityAuditEvents } from '@lib/services/security-audit.service'
import { NextRequest, NextResponse } from 'next/server'

import type { SecurityAuditFilter } from '~/api/security-audit'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const params = request.nextUrl.searchParams
    const filter: SecurityAuditFilter = {
      limit: params.get('limit') ? Number(params.get('limit')) : undefined,
      offset: params.get('offset') ? Number(params.get('offset')) : undefined,
      targetUserId: params.get('targetUserId') ?? undefined,
      actorUserId: params.get('actorUserId') ?? undefined,
      action: params.get('action') ?? undefined,
      startOfDateIso: params.get('startOfDateIso') ?? undefined,
      endOfDateIso: params.get('endOfDateIso') ?? undefined,
    }

    const data = await listSecurityAuditEvents(filter)

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
