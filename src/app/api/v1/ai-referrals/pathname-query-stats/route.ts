import connectDB from '@lib/db/client'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { aggregateReferrerQueryParamsForPathname } from '@lib/services/ai-referrals-pathname-detail.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const MAX_DAYS = 30

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const rawDays = request.nextUrl.searchParams.get('days')
    const rawPathname = request.nextUrl.searchParams.get('pathname')

    const days = Math.min(MAX_DAYS, Math.max(1, rawDays ? Number.parseInt(rawDays, 10) || 7 : 7))

    if (!rawPathname || !rawPathname.trim()) {
      return NextResponse.json({ message: t('aiReferrals.errors.pathnameRequired') }, { status: 400 })
    }

    const pathname = decodeURIComponent(rawPathname.trim())

    await connectDB()

    const data = await aggregateReferrerQueryParamsForPathname({ pathname, windowDays: days })

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
