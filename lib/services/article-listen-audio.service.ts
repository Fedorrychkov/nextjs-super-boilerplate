import connectDB from '@lib/db/client'
import Article from '@lib/db/models/Article'
import ArticleRevision from '@lib/db/models/ArticleRevision'
import { ValidationError } from '@lib/error/custom-errors'
import { extractPlainTextFromRevisionContent } from '@lib/services/llm/extract-plain-text-from-revision-content'
import { recordLlmUsageEvent } from '@lib/services/llm/llm-usage-persistence'
import { OPENAI_TTS_MAX_INPUT_CHARS, resolveOpenAiTtsVoice, synthesizeOpenAiSpeechMp3 } from '@lib/services/llm/openai-speech.service'
import { createMediaAssetFromBuffer, deleteMediaAssetIfUnused } from '@lib/services/media.service'
import mongoose from 'mongoose'

import { MediaResourceType } from '~/api/media'
import { Logger } from '~/utils/logger'
import { time } from '~/utils/time'

const logger = new Logger(['ArticleListenAudio', '[lib/services/article-listen-audio.service.ts]'])

export type GenerateArticleListenAudioResult = {
  assetId: string
  proxyPath: string
  sourceRevisionId: string
  textTruncated: boolean
  generatedAt: string
}

export async function generateArticleListenAudio(params: { articleId: string; userId: string; voice?: string }): Promise<GenerateArticleListenAudioResult> {
  if (!mongoose.Types.ObjectId.isValid(params.articleId)) {
    throw new ValidationError('Invalid article id')
  }

  await connectDB()

  const article = await Article.findById(params.articleId)

  if (!article) {
    throw new ValidationError('Article not found')
  }

  if (!article.revisionId) {
    throw new ValidationError('Article has no revision linked')
  }

  const revision = await ArticleRevision.findById(article.revisionId)

  if (!revision) {
    throw new ValidationError('Article revision not found')
  }

  const plain = extractPlainTextFromRevisionContent(revision.content ?? '').trim()

  if (!plain) {
    throw new ValidationError('No extractable text in revision for TTS')
  }

  const textTruncated = plain.length > OPENAI_TTS_MAX_INPUT_CHARS
  const voice = resolveOpenAiTtsVoice(params.voice)
  const ttsInput = plain.slice(0, OPENAI_TTS_MAX_INPUT_CHARS)
  const mp3 = await synthesizeOpenAiSpeechMp3({ text: ttsInput, voice })

  const ttsCharCount = ttsInput.length

  try {
    await recordLlmUsageEvent({
      source: 'listen_tts',
      userId: params.userId,
      llmModel: 'tts-1',
      articleId: params.articleId,
      revisionId: revision._id.toString(),
      usage: {
        promptTokens: ttsCharCount,
        completionTokens: 0,
        totalTokens: ttsCharCount,
      },
    })
  } catch (e) {
    logger.warn('Failed to record listen_tts usage event', {
      articleId: params.articleId,
      error: e instanceof Error ? e.message : 'unknown',
    })
  }

  const slugPart = (article.slug ?? article._id.toString()).replace(/[^\w-]+/g, '-').slice(0, 80)
  const filename = `article-${slugPart}-listen.mp3`

  const prevAssetId = article.listenAudioAssetId?.toString() ?? null

  const asset = await createMediaAssetFromBuffer({
    buffer: mp3,
    filename,
    contentType: 'audio/mpeg',
    createdBy: params.userId,
    resourceType: MediaResourceType.AUDIO,
  })

  const generatedAt = time().toISOString()

  article.listenAudioAssetId = asset._id
  article.listenAudioSourceRevisionId = revision._id
  article.listenAudioGeneratedAt = generatedAt
  await article.save()

  if (prevAssetId && prevAssetId !== asset._id.toString()) {
    try {
      await deleteMediaAssetIfUnused(prevAssetId)
    } catch {
      // best-effort cleanup
    }
  }

  return {
    assetId: asset._id.toString(),
    proxyPath: asset.proxyPath,
    sourceRevisionId: revision._id.toString(),
    textTruncated,
    generatedAt,
  }
}
