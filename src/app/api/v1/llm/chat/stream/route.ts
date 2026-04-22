import { LLM_CONFIG } from '@config/env'
import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { llmChatRateLimit } from '@lib/security/llm-rate-limit'
import { buildArticleChatSystemPrompt } from '@lib/services/llm/build-article-chat-context'
import { getChatModelAllowlist, resolveChatModel } from '@lib/services/llm/chat-models'
import { ChatMessage, llmService } from '@lib/services/llm/llm.service'
import { appendChatTurn, findOrCreateSession } from '@lib/services/llm/llm-chat-persistence'
import { recordLlmUsageEvent } from '@lib/services/llm/llm-usage-persistence'
import mongoose from 'mongoose'
import { NextRequest, NextResponse } from 'next/server'

import { ArticleModel } from '~/api/article'
import { ArticleRevisionModel } from '~/api/article-revision'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { Logger } from '~/utils/logger'
import { time } from '~/utils/time'

const logger = new Logger(['LlmChatStreamRoute', '[api/v1/llm/chat/stream]'])

const MAX_MESSAGES = 32
const MAX_MESSAGE_CHARS = 12_000

type ClientMessage = { role: 'user' | 'assistant'; content: string }

type ChatStreamBody = {
  articleId?: string
  revisionId?: string
  messages?: ClientMessage[]
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
    articleId: articleIdString(o.articleId),
  }
}

function articleIdString(v: unknown): string {
  if (v && typeof v === 'object' && 'toString' in v) {
    return String(v)
  }

  return String(v ?? '')
}

function sanitizeClientMessages(raw: ClientMessage[] | undefined): ClientMessage[] {
  if (!Array.isArray(raw)) {
    return []
  }

  const out: ClientMessage[] = []

  for (const m of raw.slice(-MAX_MESSAGES)) {
    if (m.role !== 'user' && m.role !== 'assistant') {
      continue
    }

    const content = typeof m.content === 'string' ? m.content.slice(0, MAX_MESSAGE_CHARS) : ''

    if (!content.trim()) {
      continue
    }

    out.push({ role: m.role, content })
  }

  return out
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

    let body: ChatStreamBody

    try {
      body = (await request.json()) as ChatStreamBody
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

    const clientMessages = sanitizeClientMessages(body.messages)

    if (clientMessages.length === 0 || !clientMessages.some((m) => m.role === 'user')) {
      return NextResponse.json({ message: t('article.errors.llmMessageRequired') }, { status: 400 })
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

    const systemPrompt = buildArticleChatSystemPrompt({
      article: toArticleModel(articleDoc),
      revision: toRevisionModel(revisionDoc),
    })

    const messages: ChatMessage[] = []

    messages.push({ role: 'system', content: systemPrompt })

    for (const m of clientMessages) {
      messages.push({ role: m.role, content: m.content })
    }

    const requestId = crypto.randomUUID()
    const started = time()
    const userId = authResult.payload.sub

    const encoder = new TextEncoder()

    let assistantTextAccumulator = ''

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        }

        send({ type: 'start', requestId })

        try {
          let lastUsage: { promptTokens: number; completionTokens: number; totalTokens: number } | null = null

          for await (const chunk of llmService.chatStream(messages, { model, temperature: 0.6, maxTokens: 4096 })) {
            if (chunk.type === 'text') {
              assistantTextAccumulator += chunk.text
              send({ type: 'delta', text: chunk.text })
            } else if (chunk.type === 'usage') {
              lastUsage = chunk.usage
              send({ type: 'usage', usage: chunk.usage })
            }
          }

          const durationMs = time().diff(started, 'milliseconds')

          const lastUser = clientMessages[clientMessages.length - 1]

          if (lastUser?.role === 'user' && assistantTextAccumulator.trim()) {
            try {
              const { id: sessionId } = await findOrCreateSession({ articleId, revisionId, userId })
              await appendChatTurn({
                sessionId,
                userContent: lastUser.content,
                assistantContent: assistantTextAccumulator,
                model,
                usage: lastUsage,
              })

              if (lastUsage) {
                try {
                  await recordLlmUsageEvent({
                    source: 'chat_stream',
                    userId,
                    llmModel: model,
                    usage: lastUsage,
                    articleId,
                    revisionId,
                    sessionId,
                    requestId,
                  })
                } catch (usageErr) {
                  logger.error('llm usage event persist failed', {
                    requestId,
                    message: usageErr instanceof Error ? usageErr.message : String(usageErr),
                  })
                }
              }
            } catch (persistErr) {
              logger.error('llm chat persist failed', {
                requestId,
                message: persistErr instanceof Error ? persistErr.message : String(persistErr),
              })
            }
          }

          logger.info('llm chat stream completed', {
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
          logger.error('stream error', { requestId, message })
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
