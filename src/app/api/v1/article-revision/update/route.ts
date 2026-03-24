import connectDB from '@lib/db/client'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleRevisionModel, ArticleRevisionStatus } from '~/api/article-revision'
import { UserRole } from '~/api/user'
import { time } from '~/utils/time'

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

    const updatedAt = time().toISOString()
    const isPublishing = body.status === ArticleRevisionStatus.CONFIRMED && !articleRevision.publishedAt

    await articleRevision.updateOne({ ...body, _id: id, updatedAt, publishedAt: isPublishing ? updatedAt : articleRevision.publishedAt })

    const data = await ArticleRevision.findById(id)

    if (!data) {
      return NextResponse.json({ message: 'Article revision not found' }, { status: 404 })
    }

    return response.json({
      ...data.toObject(),
      id: data._id.toString(),
      publishedAt: data?.publishedAt ? time(data.publishedAt).toISOString() : null,
      updatedAt: data?.updatedAt ? time(data.updatedAt).toISOString() : null,
      createdAt: data?.createdAt ? time(data.createdAt).toISOString() : null,
    })
  })

export const PUT = withGlobalRateLimit(withAuthMiddleware(handler))
