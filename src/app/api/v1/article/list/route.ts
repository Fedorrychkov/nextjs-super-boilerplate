import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleFilter } from '~/api/article'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequest } from '~/lib/i18n/server'
import { Logger } from '~/utils/logger'

const logger = new Logger('ArticleListRoute')

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    await connectDB()

    const filter: ArticleFilter = { ...Object.fromEntries(request.nextUrl.searchParams.entries()) }

    logger.info('filter', filter)

    const data = await Article.findListPaginated(filter)

    return response.json({
      ...data,
      list: data.list.map((article) => ({
        ...article.toObject(),
        revisionId: article.revisionId?.toString(),
        id: article._id.toString(),
      })),
    })
  })

export const GET = withGlobalRateLimit(withAuthMiddleware(handler))
