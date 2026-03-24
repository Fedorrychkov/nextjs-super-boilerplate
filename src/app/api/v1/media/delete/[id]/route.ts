import { apiErrorHandlerContainer, RouteHandlerContext, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { deleteMediaAssetIfUnused } from '@lib/services/media.service'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'

const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: 'Insufficient permissions' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const articleRevisionId = searchParams.get('articleRevisionId')
    const paramsData = context ? await context.params : undefined
    const rawId = paramsData?.id
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    if (!id) {
      return NextResponse.json({ message: 'Media asset id is required' }, { status: 400 })
    }

    const result = await deleteMediaAssetIfUnused(id, articleRevisionId ?? null)

    if (result.reason === 'not_found') {
      return NextResponse.json({ message: 'Media asset not found' }, { status: 404 })
    }

    if (!result.deleted) {
      return NextResponse.json({ deleted: false, reason: result.reason }, { status: 409 })
    }

    if (!result.asset) {
      return NextResponse.json({ message: 'Media asset not found' }, { status: 404 })
    }

    return response.json({
      deleted: true,
      asset: {
        ...result.asset.toObject(),
        id: result.asset._id.toString(),
      },
    })
  })

export const DELETE = withGlobalRateLimit(withAuthMiddleware(handler))
