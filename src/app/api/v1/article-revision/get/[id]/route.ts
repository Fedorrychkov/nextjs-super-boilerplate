import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { apiErrorHandlerContainer, RouteHandlerContext, withApiTokenOrAuth, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleStatus } from '~/api/article'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

/**
 * Role-scoped revision read:
 * - ADMIN / EDITOR — any revision (drafts, history).
 * - other roles — only the CURRENT revision of a PUBLISHED article (the exact content served
 *   on the public page), with per-article `allowedRoles` respected. Everything else is 404 —
 *   drafts and revision history never leak to readers. Lets user agents quote article content.
 */
const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    const isStaff = [UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)

    const paramsData = context ? await context.params : undefined

    const rawId = paramsData?.id
    const id = typeof rawId === 'string' ? rawId : Array.isArray(rawId) ? rawId[0] : undefined

    if (!id) {
      return NextResponse.json({ message: t('article.errors.articleRevisionIdRequired') }, { status: 400 })
    }

    await connectDB()

    const articleRevision = await ArticleRevision.findById(id)

    if (!articleRevision) {
      return NextResponse.json({ message: t('article.errors.articleRevisionNotFound') }, { status: 404 })
    }

    if (!isStaff) {
      const article = articleRevision.articleId ? await Article.findById(articleRevision.articleId).select('status revisionId allowedRoles').lean() : null

      const isCurrentPublishedRevision =
        article != null && article.status === ArticleStatus.PUBLISHED && String(article.revisionId ?? '') === String(articleRevision._id)

      const isRoleAllowed = !article?.allowedRoles?.length || article.allowedRoles.includes(authResult.payload.role)

      // 404 (not 403): do not reveal that a draft / older revision exists.
      if (!isCurrentPublishedRevision || !isRoleAllowed) {
        return NextResponse.json({ message: t('article.errors.articleRevisionNotFound') }, { status: 404 })
      }
    }

    return response.json({
      ...articleRevision.toObject(),
      articleId: articleRevision.articleId?.toString() ?? null,
      id: articleRevision._id.toString(),
    })
  })

export const GET = withGlobalRateLimit(withApiTokenOrAuth('articles:read')(handler))
