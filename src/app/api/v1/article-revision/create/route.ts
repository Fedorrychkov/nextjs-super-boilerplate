import connectDB from '@lib/db/client'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleRevisionModel } from '~/api/article-revision'
import { UserRole } from '~/api/user'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
    }

    await connectDB()

    const body = (await request.json()) as Partial<ArticleRevisionModel>

    delete body.id

    const data = await ArticleRevision.create(body)

    return response.json({
      ...data.toObject(),
      articleId: data.articleId?.toString() ?? null,
      id: data._id.toString(),
    })
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
