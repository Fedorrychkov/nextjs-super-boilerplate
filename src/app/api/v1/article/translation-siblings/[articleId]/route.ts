import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import mongoose from 'mongoose'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { loadArticlesInTranslationGroup } from '~/lib/seo/articleTranslationAlternates'

const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const paramsData = context ? await context.params : undefined
    const rawId = paramsData?.articleId
    const articleId = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    if (!articleId || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json({ message: t('article.errors.idRequired') }, { status: 400 })
    }

    await connectDB()

    const article = await Article.findById(articleId).select('translationGroupId').lean()

    if (!article) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    const groupId = article.translationGroupId != null ? String(article.translationGroupId).trim() : ''
    const siblings = groupId ? await loadArticlesInTranslationGroup(groupId) : []

    return response.json({
      translationGroupId: groupId || null,
      siblings,
    })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
