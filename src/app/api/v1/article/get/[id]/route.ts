import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequest } from '~/lib/i18n'

const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const paramsData = context ? await context.params : undefined

    const rawId = paramsData?.id
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    if (!id) {
      return NextResponse.json({ message: t('article.errors.idRequired') }, { status: 400 })
    }

    await connectDB()

    const article = await Article.findById(id)

    if (!article) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    return response.json({
      ...article.toObject(),
      revisionId: article.revisionId?.toString() ?? null,
      id: article._id.toString(),
    })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
