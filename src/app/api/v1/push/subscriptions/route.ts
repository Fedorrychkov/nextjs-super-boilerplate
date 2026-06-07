import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { pushSubscriptionService } from '@lib/services/push-subscription.service'
import { mapPushSubscriptionDocPublic } from '@lib/utils/push-provider'
import { NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const CURRENT_ENDPOINT_HEADER = 'x-push-subscription-endpoint'

const handlerGet = async (request: NextRequest, authResult: AuthSuccessResult) => {
  return apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const user = authResult.payload
    const list = await pushSubscriptionService.list({ userId: user.sub })
    const currentEndpoint = request.headers.get(CURRENT_ENDPOINT_HEADER)

    return response.json({
      list: list.map((doc) => mapPushSubscriptionDocPublic(doc, currentEndpoint)),
    })
  })
}

const handlerDelete = async (request: NextRequest, authResult: AuthSuccessResult) => {
  return apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)
    const body = await request.json()
    const { id } = body || {}

    if (!id || typeof id !== 'string') {
      return response.json({ ok: false, error: t('push.errors.invalidParams') }, { status: 400 })
    }

    const user = authResult.payload
    const existing = await pushSubscriptionService.checkSubscriptionById(user.sub, id)

    if (!existing) {
      return response.json({ ok: false, error: t('push.errors.subscriptionNotFound') }, { status: 404 })
    }

    await pushSubscriptionService.unsubscribeById(user.sub, id)

    return response.json({ ok: true })
  })
}

export const GET = withGlobalRateLimit(withAuthMiddleware(handlerGet))
export const DELETE = withGlobalRateLimit(withAuthMiddleware(handlerDelete))
