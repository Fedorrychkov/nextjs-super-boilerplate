import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import { articleDocumentToApiJson } from '@lib/db/utils/articleApiJson'
import { apiErrorHandlerContainer, RouteHandlerContext, withApiTokenOrAuth, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleStatus } from '~/api/article'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'

const handler = (request: NextRequest, authResult: AuthSuccessResult, context?: RouteHandlerContext) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

    // Role-scoped access: staff sees any article (incl. drafts); other roles only published ones.
    const isStaff = [UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)

    const paramsData = context ? await context.params : undefined

    const rawSlug = paramsData?.slug
    const slug = typeof rawSlug === 'string' ? rawSlug : Array.isArray(rawSlug) ? rawSlug[0] : undefined

    if (!slug) {
      return NextResponse.json({ message: t('article.errors.slugRequired') }, { status: 400 })
    }

    await connectDB()

    const article = await Article.findOne(isStaff ? { slug } : { slug, status: ArticleStatus.PUBLISHED })

    if (!article) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    // Readers: respect per-article role restrictions (404, not 403 — do not leak existence).
    if (!isStaff && article.allowedRoles?.length && !article.allowedRoles.includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    return response.json(articleDocumentToApiJson(article))
  })

export const GET = withGlobalRateLimit(withApiTokenOrAuth('articles:read')(handler))
