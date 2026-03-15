import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { authMiddleware } from '@lib/security/auth'
import { pushSubscriptionService } from '@lib/services/push-subscription.service'
import { NextRequest, NextResponse } from 'next/server'

const handlerPost = async (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const authResult = await authMiddleware(request)

    if (!authResult.success) {
      return authResult.response
    }

    const body = await request.json()
    const { subscription } = body || {}

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return response.json({ ok: false, error: 'INVALID_SUBSCRIPTION' }, { status: 400 })
    }

    const dto = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      userAgent: request.headers.get('user-agent') || undefined,
    }

    const user = authResult.payload
    const sub = await pushSubscriptionService.subscribe(user.sub, dto)

    return response.json({ ok: true, id: sub._id.toString() })
  })
}

const handlerDelete = async (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const authResult = await authMiddleware(request)

    if (!authResult.success) {
      return authResult.response
    }

    const body = await request.json()
    const { endpoint } = body || {}

    if (!endpoint) {
      return response.json({ ok: false, error: 'INVALID_PARAMS' }, { status: 400 })
    }

    const user = authResult.payload
    await pushSubscriptionService.unsubscribe(user.sub, endpoint)

    return response.json({ ok: true })
  })
}

const handlerGet = async (request: NextRequest) => {
  return apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const authResult = await authMiddleware(request)

    if (!authResult.success) {
      return authResult.response
    }

    const endpoint = request.nextUrl.searchParams.get('endpoint')

    if (!endpoint) {
      return response.json({ ok: false, subscribed: false }, { status: 400 })
    }

    const user = authResult.payload
    const sub = await pushSubscriptionService.checkSubscription(user.sub, endpoint)

    return response.json({ ok: true, subscribed: !!sub })
  })
}

export const GET = withGlobalRateLimit(handlerGet)
export const POST = withGlobalRateLimit(handlerPost)
export const DELETE = withGlobalRateLimit(handlerDelete)
