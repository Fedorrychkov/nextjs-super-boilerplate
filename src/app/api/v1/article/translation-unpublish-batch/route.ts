import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { articleDocumentToApiJson } from '@lib/db/utils/articleApiJson'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import mongoose from 'mongoose'
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleStatus } from '~/api/article'
import { ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { UserRole } from '~/api/user'
import { routes } from '~/constants'
import { publicArticleCacheTag } from '~/lib/cache/publicArticlePageCache'
import { getServerTFromNextRequest } from '~/lib/i18n/server'
import {
  collectIndexablePublicUrlsForArticleSnapshot,
  collectPublishedIndexableArticleUrlsForTranslationGroups,
  collectSlugsForTranslationGroups,
} from '~/lib/seo/articleTranslationAlternates'
import { notifySearchEngines } from '~/lib/seo/indexing'
import { time } from '~/utils/time'

type Body = { articleIds?: string[] }

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    const body = (await request.json()) as Body
    const rawIds = body.articleIds

    if (!Array.isArray(rawIds) || rawIds.length < 1 || rawIds.length > 30) {
      return NextResponse.json({ message: t('article.errors.translationLinkIdsInvalid') }, { status: 400 })
    }

    const articleIds = rawIds.map((id) => String(id).trim()).filter((id) => mongoose.Types.ObjectId.isValid(id))

    if (articleIds.length !== rawIds.length) {
      return NextResponse.json({ message: t('article.errors.translationLinkIdsInvalid') }, { status: 400 })
    }

    await connectDB()

    const nowIso = time().toISOString()
    const previousUrls: string[] = []
    const groupIds = new Set<string>()

    for (const id of articleIds) {
      const art = await Article.findById(id).lean()

      if (!art) {
        continue
      }

      if (art.translationGroupId != null && String(art.translationGroupId).trim()) {
        groupIds.add(String(art.translationGroupId).trim())
      }

      const rev = art.revisionId ? await ArticleRevision.findById(art.revisionId).select('metadata').lean() : null
      const meta = rev?.metadata as { seo?: ArticleRevisionSeoMetadata | null } | undefined
      const seo = meta?.seo ?? null

      previousUrls.push(
        ...collectIndexablePublicUrlsForArticleSnapshot({
          status: String(art.status ?? ''),
          visibility: String(art.visibility ?? ''),
          slug: art.slug != null ? String(art.slug) : '',
          seo,
        }),
      )
    }

    const unpublished: string[] = []

    for (const id of articleIds) {
      const res = await Article.updateOne(
        { _id: id },
        {
          $set: {
            status: ArticleStatus.UNPUBLISHED,
            updatedAt: nowIso,
          },
        },
      )

      if (res.matchedCount > 0) {
        unpublished.push(id)
      }
    }

    const allAffected = await Article.find({ _id: { $in: articleIds } }).select('translationGroupId slug')
    for (const a of allAffected) {
      if (a.translationGroupId != null && String(a.translationGroupId).trim()) {
        groupIds.add(String(a.translationGroupId).trim())
      }
    }

    const slugSet = new Set<string>([...allAffected.map((a) => String(a.slug ?? '')).filter(Boolean)])
    const fromGroups = await collectSlugsForTranslationGroups([...groupIds])
    for (const s of fromGroups) {
      slugSet.add(s)
    }

    for (const s of slugSet) {
      revalidateTag(publicArticleCacheTag(s), 'max')
      revalidatePath(routes.articlePublic.path.replace(':slug', s))
    }

    const { canonicals: groupCanonicals } =
      groupIds.size > 0 ? await collectPublishedIndexableArticleUrlsForTranslationGroups([...groupIds]) : { canonicals: [] as string[] }

    const urlsForIndexing = Array.from(new Set([...previousUrls, ...groupCanonicals]))

    if (urlsForIndexing.length > 0) {
      await notifySearchEngines(urlsForIndexing)
    }

    revalidatePath('/sitemap.xml')
    revalidatePath('/rss.xml')

    const updated = await Article.find({ _id: { $in: unpublished } })

    return response.json({
      unpublishedIds: unpublished,
      articles: updated.map((doc) => articleDocumentToApiJson(doc)),
    })
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
