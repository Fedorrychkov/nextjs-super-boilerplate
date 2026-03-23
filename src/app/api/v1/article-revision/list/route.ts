import connectDB from '@lib/db/client'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleRevisionFilter } from '~/api/article-revision'
import { UserRole } from '~/api/user'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
    }

    await connectDB()

    const filter: ArticleRevisionFilter = { ...Object.fromEntries(request.nextUrl.searchParams.entries()) }

    const data = await ArticleRevision.findListPaginated(filter)

    return response.json({
      ...data,
      list: data.list.map((articleRevision) => ({
        ...articleRevision.toObject(),
        articleId: articleRevision.articleId?.toString(),
        id: articleRevision._id.toString(),
      })),
    })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
