import { LLM_CONFIG } from '@config/env'
import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { llmChatRateLimit } from '@lib/security/llm-rate-limit'
import { buildSeoSuggestMessages } from '@lib/services/llm/build-seo-suggest-prompt'
import { getChatModelAllowlist, resolveChatModel } from '@lib/services/llm/chat-models'
import { ChatMessage, llmService } from '@lib/services/llm/llm.service'
import { recordLlmUsageEvent } from '@lib/services/llm/llm-usage-persistence'
import mongoose from 'mongoose'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleModel } from '~/api/article'
import { ArticleRevisionModel } from '~/api/article-revision'
import { parseSeoSuggestJson } from '~/api/llm'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { Logger } from '~/utils/logger'

const logger = new Logger(['LlmSeoSuggestRoute', '[api/v1/llm/seo/suggest]'])

type Body = {
  articleId?: string
  revisionId?: string
  model?: string
}

function toArticleModel(doc: mongoose.Document & { _id: mongoose.Types.ObjectId }): ArticleModel {
  const o = doc.toObject() as Record<string, unknown>

  return {
    ...(o as ArticleModel),
    id: doc._id.toString(),
    revisionId: o.revisionId != null ? String(o.revisionId) : null,
  }
}

function toRevisionModel(doc: mongoose.Document & { _id: mongoose.Types.ObjectId }): ArticleRevisionModel {
  const o = doc.toObject() as Record<string, unknown>

  return {
    ...(o as ArticleRevisionModel),
    id: doc._id.toString(),
    articleId: o.articleId && typeof o.articleId === 'object' && 'toString' in o.articleId ? String(o.articleId) : String(o.articleId ?? ''),
  }
}

const handlerPost = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(
    request,
    logger,
  )(async () => {
    const { t } = await getServerTFromNextRequestAsync(request)

    if (![UserRole.ADMIN, UserRole.EDITOR].includes(authResult.payload.role)) {
      return NextResponse.json({ message: t('errors.insufficientPermissions') }, { status: 403 })
    }

    if (!LLM_CONFIG.enabled || !LLM_CONFIG.apiKey?.trim()) {
      return NextResponse.json({ message: t('article.errors.llmNotConfigured') }, { status: 503 })
    }

    try {
      await llmChatRateLimit.consume(`llm:${authResult.payload.sub}`)
    } catch {
      return NextResponse.json({ message: t('errors.tooManyRequests') }, { status: 429 })
    }

    let body: Body

    try {
      body = (await request.json()) as Body
    } catch {
      return NextResponse.json({ message: t('errors.unknown') }, { status: 400 })
    }

    const articleId = typeof body.articleId === 'string' ? body.articleId.trim() : ''
    const revisionId = typeof body.revisionId === 'string' ? body.revisionId.trim() : ''

    if (!articleId || !mongoose.Types.ObjectId.isValid(articleId)) {
      return NextResponse.json({ message: t('article.errors.idRequired') }, { status: 400 })
    }

    if (!revisionId || !mongoose.Types.ObjectId.isValid(revisionId)) {
      return NextResponse.json({ message: t('article.errors.articleRevisionIdRequired') }, { status: 400 })
    }

    await connectDB()

    const articleDoc = await Article.findById(articleId)
    const revisionDoc = await ArticleRevision.findById(revisionId)

    if (!articleDoc) {
      return NextResponse.json({ message: t('article.errors.notFound') }, { status: 404 })
    }

    if (!revisionDoc) {
      return NextResponse.json({ message: t('article.errors.articleRevisionNotFound') }, { status: 404 })
    }

    if (revisionDoc.articleId.toString() !== articleDoc._id.toString()) {
      return NextResponse.json({ message: t('article.errors.llmRevisionMismatch') }, { status: 400 })
    }

    const allowlist = getChatModelAllowlist()
    const model = resolveChatModel(body.model, allowlist)

    const article = toArticleModel(articleDoc)
    const revision = toRevisionModel(revisionDoc)

    const { system, user } = buildSeoSuggestMessages({ article, revision })

    const messages: ChatMessage[] = [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]

    try {
      const completion = await llmService.chat(messages, {
        model,
        temperature: 0.35,
        maxTokens: 2048,
        responseFormatJson: true,
      })

      const suggest = parseSeoSuggestJson(completion.content.trim())

      if (!suggest) {
        logger.warn('seo suggest JSON parse failed', { preview: completion.content?.slice(0, 200) })

        return NextResponse.json({ message: t('article.errors.llmSuggestParseFailed') }, { status: 422 })
      }

      if (completion.usage) {
        try {
          await recordLlmUsageEvent({
            source: 'seo_suggest',
            userId: authResult.payload.sub,
            llmModel: model,
            usage: completion.usage,
            articleId,
            revisionId,
          })
        } catch (usageErr) {
          logger.error('seo suggest usage persist failed', {
            message: usageErr instanceof Error ? usageErr.message : String(usageErr),
          })
        }
      }

      return NextResponse.json({
        suggest,
        usage: completion.usage,
        model,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.unknown')

      logger.error('seo suggest failed', { message })

      return NextResponse.json({ message }, { status: 502 })
    }
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handlerPost))
