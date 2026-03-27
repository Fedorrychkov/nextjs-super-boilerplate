import connectDB from '@lib/db/client'
import UserSettings from '@lib/db/models/UserSettings'
import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequest } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const paramsData = context ? await context.params : undefined
    const rawId = paramsData?.id
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    if (!id) {
      return NextResponse.json({ message: t('user.errors.idRequired') }, { status: 400 })
    }

    await connectDB()

    const settings = await UserSettings.findOne({ userId: id }).select('mfaEnabled mfaSecret').lean()
    const mfaEnabled = Boolean(settings?.mfaEnabled && settings?.mfaSecret)

    return response.json({
      mfaEnabled,
    })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
