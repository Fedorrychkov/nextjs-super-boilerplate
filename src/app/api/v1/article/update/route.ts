import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { articleDocumentToApiJson } from '@lib/db/utils/articleApiJson'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleModel, ArticleStatus } from '~/api/article'
import { ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { UserRole } from '~/api/user'
import { routes } from '~/constants'
import { publicArticleCacheTag } from '~/lib/cache/publicArticlePageCache'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { resolveIndexingUrlsForArticleTransition } from '~/lib/seo/articleIndexingNotify'
import { collectSlugsForTranslationGroups } from '~/lib/seo/articleTranslationAlternates'
import { notifySearchEngines } from '~/lib/seo/indexing'
import { time } from '~/utils/time'

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

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

    const prevRevisionForSeo = article.revisionId ? await ArticleRevision.findById(article.revisionId).select('metadata').lean() : null
    const prevSeoBlock = prevRevisionForSeo?.metadata as { seo?: ArticleRevisionSeoMetadata | null } | undefined
    const prevSeo = prevSeoBlock?.seo ?? null

    const updatedAt = time().toISOString()
    const isPublishing = body.status === ArticleStatus.PUBLISHED && !article.publishedAt

    await article.updateOne({ ...body, _id: id, updatedAt, publishedAt: isPublishing ? updatedAt : article.publishedAt })

    const data = await Article.findById(id)

    if (!data) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    const currentRevision = data.revisionId ? await ArticleRevision.findById(data.revisionId) : null
    const revisionMetadata = currentRevision?.metadata as { seo?: ArticleRevisionSeoMetadata | null } | undefined
    const seo = revisionMetadata?.seo

    const urlsForIndexing = await resolveIndexingUrlsForArticleTransition({
      before: {
        status: article.status,
        visibility: article.visibility,
        slug: article.slug,
        translationGroupId: article.translationGroupId,
        revisionSeo: prevSeo,
      },
      after: {
        status: data.status,
        visibility: data.visibility ?? article.visibility,
        slug: data.slug,
        translationGroupId: data.translationGroupId,
        revisionSeo: seo ?? null,
      },
    })

    if (urlsForIndexing.length > 0) {
      await notifySearchEngines(urlsForIndexing)
    }

    const groupIds = new Set<string>()

    if (data.translationGroupId != null && String(data.translationGroupId).trim()) {
      groupIds.add(String(data.translationGroupId).trim())
    }

    if (article.translationGroupId != null && String(article.translationGroupId).trim()) {
      groupIds.add(String(article.translationGroupId).trim())
    }

    const fromGroups = groupIds.size > 0 ? await collectSlugsForTranslationGroups([...groupIds]) : []
    const slugSet = new Set<string>([...fromGroups, previousSlug, data.slug ?? undefined].filter((s): s is string => Boolean(s)))

    for (const s of slugSet) {
      revalidateTag(publicArticleCacheTag(s), 'max')
      revalidatePath(routes.articlePublic.path.replace(':slug', s))
    }

    revalidatePath('/sitemap.xml')
    revalidatePath('/rss.xml')

    return response.json(articleDocumentToApiJson(data))
  })

export const PUT = withGlobalRateLimit(withAuthMiddleware(handler))
