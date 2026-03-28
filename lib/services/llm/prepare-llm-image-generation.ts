import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import mongoose from 'mongoose'

import type { ArticleModel } from '~/api/article'
import type { ArticleRevisionModel } from '~/api/article-revision'
import type { TFunction } from '~/lib/i18n/getT'
import { type Logger } from '~/utils/logger'

import { buildImagePromptUserBlock, IMAGE_PROMPT_FROM_ARTICLE_SYSTEM } from './build-image-prompt-messages'
import { getChatModelAllowlist, resolveChatModel } from './chat-models'
import { getImageModelAllowlist, type ImageAspectRatioOption, resolveAspectRatioOption, resolveImageModel } from './image-models'
import { ChatMessage, llmService } from './llm.service'
import { recordLlmUsageEvent } from './llm-usage-persistence'

export const MAX_LLM_IMAGE_CUSTOM_PROMPT_CHARS = 8_000

export type LlmImageGenerateRequestBody = {
  articleId?: string
  revisionId?: string
  imageModel?: string
  aspectRatioId?: string
  promptSource?: 'custom' | 'fromArticle'
  prompt?: string
}

export type PreparedLlmImageGeneration = {
  articleId: string
  revisionId: string
  finalPrompt: string
  imageModel: string
  aspect: ImageAspectRatioOption
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

/**
 * Validates article/revision, resolves final image prompt (custom or derived from article).
 * Records `image_prompt_article` usage when applicable.
 */
export async function prepareLlmImageGeneration(params: {
  body: LlmImageGenerateRequestBody
  userId: string
  t: TFunction
  logger: Logger
}): Promise<{ ok: true; data: PreparedLlmImageGeneration } | { ok: false; status: number; message: string }> {
  const { body, userId, t, logger } = params

  const articleId = typeof body.articleId === 'string' ? body.articleId.trim() : ''
  const revisionId = typeof body.revisionId === 'string' ? body.revisionId.trim() : ''

  if (!articleId || !mongoose.Types.ObjectId.isValid(articleId)) {
    return { ok: false, status: 400, message: t('article.errors.idRequired') }
  }

  if (!revisionId || !mongoose.Types.ObjectId.isValid(revisionId)) {
    return { ok: false, status: 400, message: t('article.errors.articleRevisionIdRequired') }
  }

  const promptSource = body.promptSource === 'fromArticle' ? 'fromArticle' : 'custom'
  const customPrompt = typeof body.prompt === 'string' ? body.prompt.trim().slice(0, MAX_LLM_IMAGE_CUSTOM_PROMPT_CHARS) : ''

  if (promptSource === 'custom' && !customPrompt) {
    return { ok: false, status: 400, message: t('article.errors.llmImagePromptRequired') }
  }

  await connectDB()

  const articleDoc = await Article.findById(articleId)
  const revisionDoc = await ArticleRevision.findById(revisionId)

  if (!articleDoc) {
    return { ok: false, status: 404, message: t('article.errors.notFound') }
  }

  if (!revisionDoc) {
    return { ok: false, status: 404, message: t('article.errors.articleRevisionNotFound') }
  }

  if (revisionDoc.articleId.toString() !== articleDoc._id.toString()) {
    return { ok: false, status: 400, message: t('article.errors.llmRevisionMismatch') }
  }

  const article = toArticleModel(articleDoc)
  const revision = toRevisionModel(revisionDoc)

  const imageAllow = getImageModelAllowlist()
  const imageModel = resolveImageModel(body.imageModel, imageAllow)
  const aspect = resolveAspectRatioOption(body.aspectRatioId)

  let finalPrompt = customPrompt

  if (promptSource === 'fromArticle') {
    const chatAllow = getChatModelAllowlist()
    const textModel = resolveChatModel(undefined, chatAllow)
    const messages: ChatMessage[] = [
      { role: 'system', content: IMAGE_PROMPT_FROM_ARTICLE_SYSTEM },
      { role: 'user', content: buildImagePromptUserBlock({ article, revision }) },
    ]

    try {
      const derived = await llmService.chat(messages, {
        model: textModel,
        temperature: 0.45,
        maxTokens: 500,
      })

      finalPrompt = derived.content.trim().replace(/^["']|["']$/g, '')

      if (!finalPrompt) {
        return { ok: false, status: 422, message: t('article.errors.llmImagePromptDeriveFailed') }
      }

      if (derived.usage) {
        try {
          await recordLlmUsageEvent({
            source: 'image_prompt_article',
            userId,
            llmModel: textModel,
            usage: derived.usage,
            articleId,
            revisionId,
          })
        } catch (e) {
          logger.error('image_prompt_article usage persist failed', {
            message: e instanceof Error ? e.message : String(e),
          })
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.unknown')

      logger.error('image prompt from article failed', { message })

      return { ok: false, status: 502, message }
    }
  }

  return {
    ok: true,
    data: {
      articleId,
      revisionId,
      finalPrompt,
      imageModel,
      aspect,
    },
  }
}
