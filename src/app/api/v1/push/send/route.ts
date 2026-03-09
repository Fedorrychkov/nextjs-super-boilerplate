import { apiErrorHandlerContainer } from '@lib/error/api-error-handler'
import { authMiddleware } from '@lib/middleware/auth.middleware'
import { withGlobalRateLimit } from '@lib/rate-limit'
import { webPushService } from '@lib/services/web-push.service'
import { NextRequest } from 'next/server'

import { AnyString } from '~/types'

const handler = (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
    const authResult = await authMiddleware(request)

    if (!authResult.success) {
      return authResult.response
    }

    const user = authResult.payload

    const body: { type: 'test' | AnyString } = await req.json()

    const result = await webPushService.sendToUser(user.sub, {
      type: body.type,
      title: 'New message',
      body: `Example body for ${body.type} request`,
      url: '/ui-kit',
      tag: 'ui-kit',
      dedupId: 'ui-kit',
      ts: Date.now(),
    })

    return res.json({ ok: true, count: result }, { status: 200 })
  })
}

export const POST = withGlobalRateLimit(handler)
