import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import { ValidationError } from '@lib/error/custom-errors'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { generateArticleListenAudio } from '@lib/services/article-listen-audio.service'
import { revalidateTag } from 'next/cache'
import { NextRequest, NextResponse } from 'next/server'

import { UserRole } from '~/api/user'
import { publicArticleCacheTag } from '~/lib/cache/publicArticlePageCache'
import { getServerTFromNextRequest } from '~/lib/i18n/server'
import { Logger } from '~/utils/logger'

const logger = new Logger(['ArticleListenAudioGenerateRoute', '[api/v1/article/listen-audio/generate]'])

type Body = {
  articleId?: string
  voice?: string
}

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(
    request,
    logger,
  )(async () => {
    const { t } = getServerTFromNextRequest(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    let body: Body

    try {
      body = (await request.json()) as Body
    } catch {
      return NextResponse.json({ message: t('errors.unknown') }, { status: 400 })
    }

    const articleId = typeof body.articleId === 'string' ? body.articleId.trim() : ''

    if (!articleId) {
      return NextResponse.json({ message: t('article.errors.idRequired') }, { status: 400 })
    }

    try {
      const result = await generateArticleListenAudio({
        articleId,
        userId: authResult.payload.sub,
        voice: body.voice,
      })

      await connectDB()
      const article = await Article.findById(articleId)

      if (article?.slug) {
        revalidateTag(publicArticleCacheTag(article.slug), 'max')
      }

      return NextResponse.json(result)
    } catch (err) {
      if (err instanceof ValidationError) {
        return NextResponse.json({ message: err.message }, { status: 400 })
      }

      const message = err instanceof Error ? err.message : t('errors.unknown')

      logger.error('listen audio generate failed', { message })

      if (message.includes('LLM_API_KEY') || message.includes('not configured')) {
        return NextResponse.json({ message: t('article.errors.llmNotConfigured') }, { status: 503 })
      }

      return NextResponse.json({ message }, { status: 502 })
    }
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
