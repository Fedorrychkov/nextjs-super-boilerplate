import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { getPublicArticlesListEnriched } from '@lib/services/public-articles-list.service'
import { NextRequest, NextResponse } from 'next/server'

import { articleFilterFromPublicSearchParams } from '~/api/article/publicListQuery'
import { Logger } from '~/utils/logger'

const logger = new Logger('PublicArticleListRoute')

const handler = (request: NextRequest) =>
  apiErrorHandlerContainer(
    request,
    logger,
  )(async (response: typeof NextResponse) => {
    const raw = Object.fromEntries(request.nextUrl.searchParams.entries())
    const filter = articleFilterFromPublicSearchParams(raw)
    const data = await getPublicArticlesListEnriched(filter)

    return response.json(data)
  })

export const GET = withGlobalRateLimit(handler)
