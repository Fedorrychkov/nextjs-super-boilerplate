import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { platformNotificationService } from '@lib/services/platform-notification.service'
import { NextRequest } from 'next/server'

import { PlatformNotificationType } from '~/api/notification'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { AnyString } from '~/types'

const handler = (request: NextRequest, authResult: AuthSuccessResult) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const user = authResult.payload

    const body: { type: 'test' | AnyString } = await req.json()
    const pushType = body.type ?? PlatformNotificationType.TEST

    const notification = await platformNotificationService.createAndDeliver(
      {
        recipientUserId: user.sub,
        type: pushType === 'test' ? PlatformNotificationType.TEST : String(pushType),
        title: t('push.messages.newMessage'),
        body: t('push.messages.exampleBody', { type: pushType }),
        urlPath: '/ui-kit',
        source: 'manual_test',
      },
      t,
    )

    return res.json({ ok: true, notification }, { status: 200 })
  })
}

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
