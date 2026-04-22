import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import { articleDocumentToApiJson } from '@lib/db/utils/articleApiJson'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { randomUUID } from 'crypto'
import mongoose from 'mongoose'
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { routes } from '~/constants'
import { publicArticleCacheTag } from '~/lib/cache/publicArticlePageCache'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { collectSlugsForTranslationGroups } from '~/lib/seo/articleTranslationAlternates'
import { time } from '~/utils/time'

type Body = {
  articleIds?: string[]
  translationGroupId?: string | null
}

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(request)(async (response: typeof NextResponse) => {
    const { t } = await getServerTFromNextRequestAsync(request)

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

    const articles = await Article.find({ _id: { $in: articleIds } }).select('_id translationGroupId slug')

    if (articles.length !== articleIds.length) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    const trimmedIncoming = body.translationGroupId != null ? String(body.translationGroupId).trim() : ''
    const fromExisting = articles.map((a) => a.translationGroupId).find((g) => g != null && String(g).trim())
    const translationGroupId = trimmedIncoming || (fromExisting != null ? String(fromExisting).trim() : '') || randomUUID()

    const updatedAt = time().toISOString()

    await Article.updateMany({ _id: { $in: articleIds } }, { $set: { translationGroupId, updatedAt } })

    const groupIds = new Set<string>()
    for (const a of articles) {
      if (a.translationGroupId != null && String(a.translationGroupId).trim()) {
        groupIds.add(String(a.translationGroupId).trim())
      }
    }
    groupIds.add(translationGroupId)

    const slugs = await collectSlugsForTranslationGroups([...groupIds])
    for (const s of slugs) {
      revalidateTag(publicArticleCacheTag(s), 'max')
      revalidatePath(routes.articlePublic.path.replace(':slug', s))
    }

    revalidatePath('/sitemap.xml')
    revalidatePath('/rss.xml')

    const updated = await Article.find({ _id: { $in: articleIds } })

    return response.json({
      translationGroupId,
      articles: updated.map((doc) => articleDocumentToApiJson(doc)),
    })
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
