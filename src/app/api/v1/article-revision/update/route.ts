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

    const body = (await request.json()) as Partial<ArticleRevisionModel> & { id: string }

    const articleRevision = await ArticleRevision.findById(body.id)

    if (!articleRevision) {
      return NextResponse.json({ message: 'Article revision not found' }, { status: 404 })
    }

    const id = body.id

    await articleRevision.updateOne({ ...body, _id: id })

    const data = await ArticleRevision.findById(id)

    if (!data) {
      return NextResponse.json({ message: 'Article revision not found' }, { status: 404 })
    }

    return response.json({
      ...data.toObject(),
      id: data._id.toString(),
    })
  })

export const PUT = withGlobalRateLimit(withAuthMiddleware(handler))
