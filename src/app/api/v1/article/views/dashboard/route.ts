import connectDB from '@lib/db/client'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { buildArticleViewsDashboard } from '@lib/services/article-view.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const raw = request.nextUrl.searchParams.get('limit')
    const limit = raw ? Math.min(200, Math.max(1, Number.parseInt(raw, 10) || 80)) : 80

    await connectDB()

    const data = await buildArticleViewsDashboard(limit)

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
