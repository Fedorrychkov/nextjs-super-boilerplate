import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { platformNotificationService } from '@lib/services/platform-notification.service'
import { NextRequest, NextResponse } from 'next/server'

import type { PlatformNotificationFilter } from '~/api/notification'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const filter: PlatformNotificationFilter = {
      ...Object.fromEntries(request.nextUrl.searchParams.entries()),
    }

    const data = await platformNotificationService.listPaginated(filter)

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
