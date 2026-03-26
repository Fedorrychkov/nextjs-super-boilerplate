import connectDB from '@lib/db/client'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { buildAiReferralsDashboard } from '@lib/services/ai-referrals-dashboard.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequest } from '~/lib/i18n/server'

const MAX_DAYS = 30

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const raw = request.nextUrl.searchParams.get('days')
    const rawPathname = request.nextUrl.searchParams.get('pathname')
    const days = Math.min(MAX_DAYS, Math.max(1, raw ? Number.parseInt(raw, 10) || 7 : 7))

    await connectDB()

    const data = await buildAiReferralsDashboard({ days, pathname: rawPathname ? decodeURIComponent(rawPathname) : null })

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
