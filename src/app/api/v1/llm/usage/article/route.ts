import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { buildLlmUsageForArticleRevision } from '@lib/services/llm/llm-usage-dashboard.service'
import mongoose from 'mongoose'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const articleId = request.nextUrl.searchParams.get('articleId')?.trim() ?? ''
    const revisionId = request.nextUrl.searchParams.get('revisionId')?.trim() ?? ''

    if (!articleId || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json({ message: t('article.errors.idRequired') }, { status: 400 })
    }

    if (!revisionId || !mongoose.Types.ObjectId.isValid(revisionId)) {
      return NextResponse.json({ message: t('article.errors.articleRevisionIdRequired') }, { status: 400 })
    }

    await connectDB()

    const articleDoc = await Article.findById(articleId)
    const revisionDoc = await ArticleRevision.findById(revisionId)

    if (!articleDoc) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    if (!revisionDoc) {
      return NextResponse.json({ message: t('article.errors.articleRevisionNotFound') }, { status: 404 })
    }

    if (revisionDoc.articleId.toString() !== articleDoc._id.toString()) {
      return NextResponse.json({ message: t('article.errors.llmRevisionMismatch') }, { status: 400 })
    }

    const data = await buildLlmUsageForArticleRevision({
      articleId,
      revisionId,
      userId: authResult.payload.sub,
    })

    return response.json(data)
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
