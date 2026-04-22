import { LLM_CONFIG } from '@config/env'
import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { llmChatRateLimit } from '@lib/security/llm-rate-limit'
import { buildImagePromptUserBlock, IMAGE_PROMPT_STREAM_SYSTEM } from '@lib/services/llm/build-image-prompt-messages'
import { getChatModelAllowlist, resolveChatModel } from '@lib/services/llm/chat-models'
import { ChatMessage, ChatStreamChunk, llmService } from '@lib/services/llm/llm.service'
import { recordLlmUsageEvent } from '@lib/services/llm/llm-usage-persistence'
import mongoose from 'mongoose'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleModel } from '~/api/article'
import { ArticleRevisionModel } from '~/api/article-revision'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { Logger } from '~/utils/logger'
import { time } from '~/utils/time'

const logger = new Logger(['LlmImagePromptStreamRoute', '[api/v1/llm/image/prompt/stream]'])

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

const handler = (request: NextRequest, authResult: AuthSuccessResult) =>
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

    const messages: ChatMessage[] = [
      { role: 'system', content: IMAGE_PROMPT_STREAM_SYSTEM },
      {
        role: 'user',
        content: buildImagePromptUserBlock({
          article: toArticleModel(articleDoc),
          revision: toRevisionModel(revisionDoc),
        }),
      },
    ]

    const requestId = crypto.randomUUID()
    const started = time()
    const userId = authResult.payload.sub
    const encoder = new TextEncoder()

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        }

        send({ type: 'start', requestId })

        try {
          let lastUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null

          for await (const chunk of llmService.chatStream(messages, { model, temperature: 0.55, maxTokens: 600 })) {
            const c = chunk as ChatStreamChunk

            if (c.type === 'text') {
              send({ type: 'delta', text: c.text })
            } else if (c.type === 'usage') {
              lastUsage = c.usage
              send({ type: 'usage', usage: c.usage })
            }
          }

          const durationMs = time().diff(started, 'milliseconds')

          if (lastUsage) {
            try {
              await recordLlmUsageEvent({
                source: 'image_prompt_stream',
                userId,
                llmModel: model,
                usage: lastUsage,
                articleId,
                revisionId,
                requestId,
              })
            } catch (usageErr) {
              logger.error('image_prompt_stream usage persist failed', {
                requestId,
                message: usageErr instanceof Error ? usageErr.message : String(usageErr),
              })
            }
          }

          logger.info('image prompt stream completed', {
            requestId,
            durationMs,
            model,
            articleId,
            revisionId,
            userId,
            usage: lastUsage,
          })

          send({
            type: 'done',
            requestId,
            durationMs,
            model,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : t('errors.unknown')

          send({ type: 'error', message })
          logger.error('image prompt stream error', { requestId, message })
        } finally {
          controller.close()
        }
      },
    })

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Request-Id': requestId,
      },
    })
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handler))
