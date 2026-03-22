import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleModel } from '~/api/article'
import { UserRole } from '~/api/user'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
    }

    await connectDB()

    const body = (await request.json()) as Partial<ArticleModel> & { id: string }

    const article = await Article.findById(body.id)

    if (!article) {
      return NextResponse.json({ message: 'Article not found' }, { status: 404 })
    }

    const id = body.id

    const data = await article.updateOne({ ...body, _id: id })

    return response.json({
      ...data.toObject(),
      revisionId: data.revisionId?.toString() ?? null,
      id: data._id.toString(),
    })
  })

export const PUT = withGlobalRateLimit(withAuthMiddleware(handler))
