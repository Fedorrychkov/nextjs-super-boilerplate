import connectDB from '@lib/db/client'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { buildRumDashboard } from '@lib/services/rum-dashboard.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'

const MAX_DAYS = 14

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
    }

    const raw = request.nextUrl.searchParams.get('days')
    const days = Math.min(MAX_DAYS, Math.max(1, raw ? Number.parseInt(raw, 10) || 7 : 7))

    await connectDB()

    const data = await buildRumDashboard(days)

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
