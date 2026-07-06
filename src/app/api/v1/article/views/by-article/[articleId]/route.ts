import connectDB from '@lib/db/client'
import { apiErrorHandlerContainer, RouteHandlerContext, withApiTokenOrAuth, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { getArticleViewsByArticleId } from '@lib/services/article-view.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const paramsData = context ? await context.params : undefined
    const rawArticleId = paramsData?.articleId
    const id = typeof rawArticleId === 'string' ? rawArticleId : Array.isArray(rawArticleId) ? rawArticleId[0] : undefined

    if (!id) {
      return NextResponse.json({ message: t('article.errors.idRequired') }, { status: 400 })
    }

    await connectDB()

    const data = await getArticleViewsByArticleId(id)

    if (!data) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withApiTokenOrAuth('articles:read')(handler))
