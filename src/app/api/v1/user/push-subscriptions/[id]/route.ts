import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { pushSubscriptionService } from '@lib/services/push-subscription.service'
import { mapPushSubscriptionDoc } from '@lib/utils/push-provider'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handlerGet = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const paramsData = context ? await context.params : undefined
    const rawId = paramsData?.id
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    if (!id) {
      return NextResponse.json({ message: t('user.errors.idRequired') }, { status: 400 })
    }

    const list = await pushSubscriptionService.list({ userId: id })

    return response.json({
      list: list.map((doc) => mapPushSubscriptionDoc(doc)),
    })
  })

const handlerDelete = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const paramsData = context ? await context.params : undefined
    const rawId = paramsData?.id
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    if (!id) {
      return NextResponse.json({ message: t('user.errors.idRequired') }, { status: 400 })
    }

    const body = await request.json()
    const { endpoint } = body || {}

    if (!endpoint) {
      return response.json({ ok: false, error: t('push.errors.invalidParams') }, { status: 400 })
    }

    const existing = await pushSubscriptionService.checkSubscription(id, endpoint)

    if (!existing) {
      return response.json({ ok: false, error: t('push.errors.subscriptionNotFound') }, { status: 404 })
    }

    await pushSubscriptionService.unsubscribe(id, endpoint)

    return response.json({ ok: true })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handlerGet))
export const DELETE = withGlobalRateLimit(withAuthMiddleware(handlerDelete))
