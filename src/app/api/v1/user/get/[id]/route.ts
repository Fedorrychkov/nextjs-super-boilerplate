import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import type { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequest } from '~/lib/i18n/server'
import { time } from '~/utils/time'

const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async () => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const paramsData = context ? await context.params : undefined
    const rawId = paramsData?.id
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    if (!id) {
      return NextResponse.json({ message: t('user.errors.idRequired') }, { status: 400 })
    }

    await connectDB()
    const user = await User.findById(id).lean()

    if (!user) {
      return NextResponse.json({ message: t('user.errors.notFound') }, { status: 404 })
    }

    return NextResponse.json({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt ? time(user.createdAt).toISOString() : null,
      updatedAt: user.updatedAt ? time(user.updatedAt).toISOString() : null,
    })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
