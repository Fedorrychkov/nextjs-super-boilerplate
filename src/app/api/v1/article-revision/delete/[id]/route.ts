import connectDB from '@lib/db/client'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'

const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
    }

    const paramsData = context ? await context.params : undefined

    const rawId = paramsData?.id
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    if (!id) {
      return NextResponse.json({ message: 'Article revision ID is required' }, { status: 400 })
    }

    await connectDB()

    const articleRevision = await ArticleRevision.findById(id)

    if (!articleRevision) {
      return NextResponse.json({ message: 'Article revision not found' }, { status: 404 })
    }

    const revisions = await ArticleRevision.findListPaginated({ articleId: id })

    if (!revisions?.count) {
      return NextResponse.json({ message: 'Article revision is in use' }, { status: 400 })
    }

    await articleRevision.deleteOne()

    return response.json({ success: true })
  })

export const DELETE = withGlobalRateLimit(withAuthMiddleware(handler))
