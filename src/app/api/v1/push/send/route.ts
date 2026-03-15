import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { webPushService } from '@lib/services/web-push.service'
import { NextRequest } from 'next/server'

import { AnyString } from '~/types'

const handler = (request: NextRequest, authResult: AuthSuccessResult) => {
  return apiErrorHandlerContainer(request)(async (res, req) => {
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

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
