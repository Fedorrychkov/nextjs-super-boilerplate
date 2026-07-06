import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import { articleDocumentToApiJson } from '@lib/db/utils/articleApiJson'
import { apiErrorHandlerContainer, withApiTokenOrAuth, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { getPublicArticlesListEnriched } from '@lib/services/public-articles-list.service'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleFilter } from '~/api/article'
import { UserRole } from '~/api/user'
import { Logger } from '~/utils/logger'

const logger = new Logger('ArticleListRoute')

/**
 * Role-scoped listing (data scoping instead of a hard 403):
 * - ADMIN / EDITOR — full admin listing: any status, drafts, raw filters.
 * - any other authenticated role (JWT or PAT) — reader view: the same published+public
 *   feed as the public /articles page, enriched with revision title/description/thumbnail.
 *   Lets user-role agents build digests without staff permissions.
 */
const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    await connectDB()

    const filter: ArticleFilter = { ...Object.fromEntries(request.nextUrl.searchParams.entries()) }

    const isStaff = [UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)

    logger.info('filter', { ...filter, isStaff })

    if (!isStaff) {
      // `status`/`visibility` are forced to published/public inside the service — reader filters cannot widen the scope.
      const data = await getPublicArticlesListEnriched(filter)

      return response.json(data)
    }

    const data = await Article.findListPaginated(filter)

    return response.json({
      ...data,
      list: data.list.map((article) => articleDocumentToApiJson(article)),
    })
  })

export const GET = withGlobalRateLimit(withApiTokenOrAuth('articles:read')(handler))
