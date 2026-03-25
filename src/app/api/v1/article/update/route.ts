import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleModel, ArticleStatus, ArticleVisibility } from '~/api/article'
import { ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { UserRole } from '~/api/user'
import { routes } from '~/constants'
import { publicArticleCacheTag } from '~/lib/cache/publicArticlePageCache'
import { getServerTFromNextRequest } from '~/lib/i18n'
import { resolveArticleCanonicalUrl } from '~/lib/seo/articleCanonical'
import { seoConfig } from '~/lib/seo/config'
import { notifySearchEngines } from '~/lib/seo/indexing'
import { time } from '~/utils/time'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    await connectDB()

    const body = (await request.json()) as Partial<ArticleModel> & { id: string }

    const article = await Article.findById(body.id)

    if (!article) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    const previousSlug = article.slug ?? undefined

    const id = body.id

    const updatedAt = time().toISOString()
    const isPublishing = body.status === ArticleStatus.PUBLISHED && !article.publishedAt

    await article.updateOne({ ...body, _id: id, updatedAt, publishedAt: isPublishing ? updatedAt : article.publishedAt })

    const data = await Article.findById(id)

    if (!data) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    const isPublishedPublic = data.status === ArticleStatus.PUBLISHED && data.visibility === ArticleVisibility.PUBLIC
    const currentRevision = data.revisionId ? await ArticleRevision.findById(data.revisionId) : null
    const revisionMetadata = currentRevision?.metadata as { seo?: ArticleRevisionSeoMetadata | null } | undefined
    const seo = revisionMetadata?.seo
    const shouldIndex = isPublishedPublic && seo?.noindex !== true
    const articleUrl = data.slug
      ? resolveArticleCanonicalUrl(seoConfig.siteUrl, data.slug, data.visibility ?? ArticleVisibility.PUBLIC, seo?.canonicalUrl)
      : null

    if (shouldIndex && articleUrl) {
      await notifySearchEngines([articleUrl])
    }

    if (articleUrl) {
      revalidatePath(routes.articlePublic.path.replace(':slug', data.slug ?? ''))
    }

    const nextSlug = data.slug ?? undefined

    if (previousSlug) {
      revalidateTag(publicArticleCacheTag(previousSlug), 'max')
    }

    if (nextSlug && nextSlug !== previousSlug) {
      revalidateTag(publicArticleCacheTag(nextSlug), 'max')
    }

    revalidatePath('/sitemap.xml')
    revalidatePath('/rss.xml')

    return response.json({
      ...data.toObject(),
      revisionId: data.revisionId?.toString() ?? null,
      id: data._id.toString(),
      publishedAt: data?.publishedAt ? time(data.publishedAt).toISOString() : null,
      updatedAt: data?.updatedAt ? time(data.updatedAt).toISOString() : null,
      createdAt: data?.createdAt ? time(data.createdAt).toISOString() : null,
    })
  })

export const PUT = withGlobalRateLimit(withAuthMiddleware(handler))
