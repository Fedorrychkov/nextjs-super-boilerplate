import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { NextRequest, NextResponse } from 'next/server'

import { getCachedPublicArticlePagePayload } from '~/lib/cache/publicArticlePageCache'
import { getServerTFromNextRequest } from '~/lib/i18n/server'
import { buildPublicArticleContentSignalHeader } from '~/lib/seo/contentSignal'

/**
 * Public, unauthenticated: returns `Content-Signal` string for a **published public** article slug.
 * Used by `src/proxy.ts` to attach the header on `/article/[slug]` HTML responses.
 */
const handler = (request: NextRequest) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)
    const slug = request.nextUrl.searchParams.get('slug')?.trim() ?? ''

    if (!slug) {
      return NextResponse.json({ message: t('article.errors.slugRequired') }, { status: 400 })
    }

    const payload = await getCachedPublicArticlePagePayload(slug)

    if (!payload) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    const allow = payload.response.article.allowAiTraining !== false
    const contentSignal = buildPublicArticleContentSignalHeader(allow)

    return response.json({ contentSignal })
  })

export const GET = withGlobalRateLimit(handler)
