import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { NextRequest, NextResponse } from 'next/server'

import { getCachedPublicArticlePagePayload } from '~/lib/cache/publicArticlePageCache'
import { ARTICLE_MARKDOWN_REWRITE_SLUG_HEADER } from '~/lib/http/articleMarkdownRewrite'
import { getServerTFromNextRequest } from '~/lib/i18n/server'
import { buildPublicArticleMarkdownDocument } from '~/lib/seo/buildPublicArticleMarkdownDocument'
import { buildPublicArticleContentSignalHeader } from '~/lib/seo/contentSignal'
import { countPublicArticleMarkdownTokens } from '~/lib/seo/countMarkdownTokens'

/**
 * Public Markdown body for a published article (used via `src/proxy.ts` rewrite when `Accept` prefers `text/markdown`).
 */
const handler = (request: NextRequest) =>
  apiErrorHandlerContainer(request)(async (_: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)
    const slug = request.headers.get(ARTICLE_MARKDOWN_REWRITE_SLUG_HEADER)?.trim() || request.nextUrl.searchParams.get('slug')?.trim() || ''

    if (!slug) {
      return NextResponse.json({ message: t('article.errors.slugRequired') }, { status: 400 })
    }

    const payload = await getCachedPublicArticlePagePayload(slug)

    if (!payload) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    const body = buildPublicArticleMarkdownDocument(payload)
    const allow = payload.response.article.allowAiTraining !== false
    const tokenCount = countPublicArticleMarkdownTokens(body)
    const headers = new Headers()

    headers.set('Content-Type', 'text/markdown; charset=utf-8')
    headers.set('Vary', 'Accept')
    headers.set('Content-Signal', buildPublicArticleContentSignalHeader(allow))
    headers.set('x-markdown-tokens', String(tokenCount))

    return new NextResponse(body, { status: 200, headers })
  })

export const GET = withGlobalRateLimit(handler)
