import connectDB from '@lib/db/client'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { findSessionIdForArticle, listChatMessages } from '@lib/services/llm/llm-chat-persistence'
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

    const userId = authResult.payload.sub
    const sessionId = await findSessionIdForArticle({ articleId, revisionId, userId })

    if (!sessionId) {
      return response.json({ sessionId: null, messages: [] })
    }

    const messages = await listChatMessages(sessionId)

    return response.json({ sessionId, messages })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
