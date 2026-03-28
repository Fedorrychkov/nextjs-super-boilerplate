import { apiErrorHandlerContainer, withGlobalRateLimit } from '@lib/middleware'
import { type ArticleViewSurface, recordArticleView } from '@lib/services/article-view.service'
import { NextRequest, NextResponse } from 'next/server'

import { getServerTFromNextRequest } from '~/lib/i18n/server'

function translateRecordViewError(t: ReturnType<typeof getServerTFromNextRequest>['t'], code: string): string {
  switch (code) {
    case 'slug_required':
      return t('article.views.errors.slug_required')
    case 'surface_invalid':
      return t('article.views.errors.surface_invalid')
    case 'surface_mismatch_public':
      return t('article.views.errors.surface_mismatch_public')
    case 'surface_mismatch_private':
      return t('article.views.errors.surface_mismatch_private')
    case 'article_not_found':
      return t('article.views.errors.article_not_found')
    case 'revision_not_found':
      return t('article.views.errors.revision_not_found')
    case 'visitor_key_required':
      return t('article.views.errors.visitor_key_required')
    case 'authentication_required':
      return t('article.views.errors.authentication_required')
    case 'forbidden':
      return t('article.views.errors.forbidden')
    default:
      return code
  }
}

function parseBody(body: unknown): { slug: string; surface: ArticleViewSurface; visitorKey?: string } | null {
  if (!body || typeof body !== 'object') {
    return null
  }

  const o = body as Record<string, unknown>
  const slug = typeof o.slug === 'string' ? o.slug : ''
  const surface = o.surface === 'public' || o.surface === 'private' ? o.surface : null
  const visitorKey = typeof o.visitorKey === 'string' ? o.visitorKey : undefined

  if (!surface) {
    return null
  }

  return { slug, surface, visitorKey }
}

const handler = (request: NextRequest) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)

    let json: unknown

    try {
      json = await request.json()
    } catch {
      return NextResponse.json({ message: t('article.views.errors.invalid_body') }, { status: 400 })
    }

    const parsed = parseBody(json)

    if (!parsed) {
      return NextResponse.json({ message: t('article.views.errors.invalid_body') }, { status: 400 })
    }

    const accessToken = request.cookies.get('accessToken')?.value ?? null

    const result = await recordArticleView({
      slug: parsed.slug,
      surface: parsed.surface,
      visitorKey: parsed.visitorKey,
      accessToken,
    })

    if (!result.ok) {
      return NextResponse.json({ message: translateRecordViewError(t, result.message) }, { status: result.status })
    }

    return response.json({ recorded: result.recorded })
  })

export const POST = withGlobalRateLimit(handler)
