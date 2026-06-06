import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { platformNotificationService } from '@lib/services/platform-notification.service'
import { NextRequest, NextResponse } from 'next/server'

import type { PlatformNotificationFilter } from '~/api/notification'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const userId = authResult.payload.sub

    if (!userId) {
      return NextResponse.json({ message: t('errors.authenticationRequired') }, { status: 401 })
    }

    const params = Object.fromEntries(request.nextUrl.searchParams.entries())
    const filter: PlatformNotificationFilter = {
      ...params,
      recipientUserId: userId,
    }

    const data = await platformNotificationService.listPaginated(filter)

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
