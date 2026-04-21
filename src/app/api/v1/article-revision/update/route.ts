import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleStatus, ArticleVisibility } from '~/api/article'
import { ArticleRevisionMetadata, ArticleRevisionModel, ArticleRevisionStatus } from '~/api/article-revision'
import { UserRole } from '~/api/user'
import { routes } from '~/constants'
import { publicArticleCacheTag } from '~/lib/cache/publicArticlePageCache'
import { getServerTFromNextRequest } from '~/lib/i18n/server'
import { validateCanonicalUrlForStorage } from '~/lib/seo/articleCanonical'
import { resolveIndexingUrlsForArticleTransition } from '~/lib/seo/articleIndexingNotify'
import { normalizeArticleLanguage } from '~/lib/seo/articleLanguage'
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

    const body = (await request.json()) as Partial<ArticleRevisionModel> & { id: string }

    const articleRevision = await ArticleRevision.findById(body.id)

    if (!articleRevision) {
      return NextResponse.json({ message: t('article.errors.articleRevisionNotFound') }, { status: 404 })
    }

    const id = body.id

    const updatedAt = time().toISOString()
    const isPublishing = body.status === ArticleRevisionStatus.CONFIRMED && !articleRevision.publishedAt

    const existingMeta = (articleRevision.metadata as ArticleRevisionMetadata | null | undefined) ?? {}
    const previousSeoForIndexing = existingMeta.seo ?? null
    const mergedSeo = { ...(existingMeta.seo ?? {}), ...(body.metadata?.seo ?? {}) }
    const canonicalValidation = validateCanonicalUrlForStorage(mergedSeo.canonicalUrl, seoConfig.siteUrl, t)
    const language = normalizeArticleLanguage(mergedSeo.language)

    if (!canonicalValidation.ok) {
      return NextResponse.json({ message: canonicalValidation.message }, { status: 400 })
    }

    const mergedMetadata: ArticleRevisionMetadata = {
      ...existingMeta,
      ...body.metadata,
      seo: {
        ...mergedSeo,
        canonicalUrl: canonicalValidation.value,
        language,
      },
    }

    await articleRevision.updateOne({
      ...body,
      _id: id,
      updatedAt,
      publishedAt: isPublishing ? updatedAt : articleRevision.publishedAt,
      metadata: mergedMetadata,
    })

    const data = await ArticleRevision.findById(id)

    if (!data) {
      return NextResponse.json({ message: t('article.errors.articleRevisionNotFound') }, { status: 404 })
    }

    const parentArticle = await Article.findById(data.articleId).select('status visibility slug translationGroupId revisionId').lean()

    if (parentArticle?.slug && String(parentArticle.revisionId) === String(data._id)) {
      revalidateTag(publicArticleCacheTag(String(parentArticle.slug)), 'max')
      revalidatePath(routes.articlePublic.path.replace(':slug', String(parentArticle.slug)))

      const isPublishedPublic =
        parentArticle.status === ArticleStatus.PUBLISHED && parentArticle.visibility === ArticleVisibility.PUBLIC && Boolean(String(parentArticle.slug).trim())

      if (isPublishedPublic) {
        const newSeo = mergedMetadata.seo ?? null
        const urlsForIndexing = await resolveIndexingUrlsForArticleTransition({
          before: {
            status: parentArticle.status,
            visibility: parentArticle.visibility,
            slug: parentArticle.slug,
            translationGroupId: parentArticle.translationGroupId,
            revisionSeo: previousSeoForIndexing,
          },
          after: {
            status: parentArticle.status,
            visibility: parentArticle.visibility,
            slug: parentArticle.slug,
            translationGroupId: parentArticle.translationGroupId,
            revisionSeo: newSeo,
          },
        })

        if (urlsForIndexing.length > 0) {
          await notifySearchEngines(urlsForIndexing)
        }
      }
    }

    revalidatePath('/sitemap.xml')
    revalidatePath('/rss.xml')

    return response.json({
      ...data.toObject(),
      id: data._id.toString(),
      publishedAt: data?.publishedAt ? time(data.publishedAt).toISOString() : null,
      updatedAt: data?.updatedAt ? time(data.updatedAt).toISOString() : null,
      createdAt: data?.createdAt ? time(data.createdAt).toISOString() : null,
    })
  })

export const PUT = withGlobalRateLimit(withAuthMiddleware(handler))
