import { LLM_CONFIG } from '@config/env'
import { apiErrorHandlerContainer, withAuthMiddleware, withGlobalRateLimit } from '@lib/middleware'
import { AuthSuccessResult } from '@lib/security/auth'
import { llmChatRateLimit } from '@lib/security/llm-rate-limit'
import { llmService } from '@lib/services/llm/llm.service'
import { recordLlmUsageEvent } from '@lib/services/llm/llm-usage-persistence'
import { type LlmImageGenerateRequestBody, prepareLlmImageGeneration } from '@lib/services/llm/prepare-llm-image-generation'
import { createMediaAssetFromBuffer } from '@lib/services/media.service'
import mongoose from 'mongoose'
import { NextRequest, NextResponse } from 'next/server'

import { MediaResourceType } from '~/api/media'
import { UserRole } from '~/api/user'
import { getServerTFromNextRequest } from '~/lib/i18n/server'
import { Logger } from '~/utils/logger'

const logger = new Logger(['LlmImageGenerateRoute', '[api/v1/llm/image/generate]'])

const mapAsset = (asset: { toObject: () => object; _id: mongoose.Types.ObjectId; createdBy?: unknown }) => ({
  ...asset.toObject(),
  id: asset._id.toString(),
  createdBy: asset.createdBy?.toString?.() ?? null,
})

const handlerPost = (request: NextRequest, authResult: AuthSuccessResult) =>
  apiErrorHandlerContainer(
    request,
    logger,
  )(async () => {
    const { t } = getServerTFromNextRequest(request)

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

    let body: LlmImageGenerateRequestBody

    try {
      body = (await request.json()) as LlmImageGenerateRequestBody
    } catch {
      return NextResponse.json({ message: t('errors.unknown') }, { status: 400 })
    }

    const prepared = await prepareLlmImageGeneration({
      body,
      userId: authResult.payload.sub,
      t,
      logger,
    })

    if (!prepared.ok) {
      return NextResponse.json({ message: prepared.message }, { status: prepared.status })
    }

    const { articleId, revisionId, finalPrompt, imageModel, aspect } = prepared.data

    try {
      const { b64Json, outputFormat, usage } = await llmService.generateImageFromPromptStream({
        model: imageModel,
        prompt: finalPrompt,
        size: aspect.size,
      })

      const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat
      const mime = outputFormat === 'jpeg' ? 'image/jpeg' : outputFormat === 'webp' ? 'image/webp' : 'image/png'
      const buffer = Buffer.from(b64Json, 'base64')

      const asset = await createMediaAssetFromBuffer({
        buffer,
        filename: `ai-generated-${Date.now()}.${ext}`,
        contentType: mime,
        createdBy: authResult.payload.sub,
        resourceType: MediaResourceType.IMAGE,
      })

      try {
        await recordLlmUsageEvent({
          source: 'image_generate',
          userId: authResult.payload.sub,
          llmModel: imageModel,
          usage,
          articleId,
          revisionId,
        })
      } catch (e) {
        logger.error('image_generate usage persist failed', { message: e instanceof Error ? e.message : String(e) })
      }

      return NextResponse.json({
        asset: mapAsset(asset),
        proxyUrl: asset?.proxyPath ?? '',
        usage,
        model: imageModel,
        aspectRatioId: aspect.id,
        promptUsed: finalPrompt,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : t('errors.unknown')

      logger.error('image generate failed', { message })

      return NextResponse.json({ message }, { status: 502 })
    }
  })

export const POST = withGlobalRateLimit(withAuthMiddleware(handlerPost))
