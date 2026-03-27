import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { UpdateUserDto, UserModel, UserRole, UserStatus } from '~/api/user'
import { getServerTFromNextRequest } from '~/lib/i18n/server'
import { time } from '~/utils/time'

const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const paramsData = context ? await context.params : undefined
    const rawId = paramsData?.id
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    const body = (await request.json()) as Partial<UpdateUserDto>

    if (!id) {
      return NextResponse.json({ message: t('user.errors.idRequired') }, { status: 400 })
    }

    if (id === authResult.payload.sub) {
      return NextResponse.json({ message: t('user.errors.selfUpdateNotAllowed') }, { status: 400 })
    }

    await connectDB()

    const user = await User.findById(id)

    if (!user) {
      return NextResponse.json({ message: t('user.errors.notFound') }, { status: 404 })
    }

    const payload: Pick<UserModel, 'role' | 'status'> = {
      role: body.role as UserRole,
      status: body.status as UserStatus,
    }

    await user.updateOne({ ...payload, _id: id, updatedAt: time().toISOString() })

    return response.json({
      success: true,
      message: t('user.messages.userUpdatedSuccessfully'),
      user: {
        id: user._id.toString(),
        email: user.email,
        role: payload.role ?? user.role,
        status: payload.status ?? user.status,
        createdAt: user.createdAt ? time(user.createdAt).toISOString() : null,
        updatedAt: user.updatedAt ? time(user.updatedAt).toISOString() : null,
      },
    })
  })

export const PUT = withGlobalRateLimit(withAuthMiddleware(handler))
