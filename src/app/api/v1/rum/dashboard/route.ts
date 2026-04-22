import connectDB from '@lib/db/client'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { buildRumDashboard } from '@lib/services/rum-dashboard.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const MAX_DAYS = 14

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const raw = request.nextUrl.searchParams.get('days')
    const days = Math.min(MAX_DAYS, Math.max(1, raw ? Number.parseInt(raw, 10) || 7 : 7))

    const rawPathname = request.nextUrl.searchParams.get('pathname')
    const pathname = rawPathname ? decodeURIComponent(rawPathname) : null

    await connectDB()

    const data = await buildRumDashboard({ days, pathname })

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
