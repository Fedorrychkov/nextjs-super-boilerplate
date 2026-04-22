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
import { getServerTFromNextRequestAsync } from '~/lib/i18n/server'
import { Logger } from '~/utils/logger'
import { time } from '~/utils/time'

const logger = new Logger(['LlmImageGenerateStreamRoute', '[api/v1/llm/image/generate/stream]'])

const mapAsset = (asset: { toObject: () => object; _id: mongoose.Types.ObjectId; createdBy?: unknown }) => ({
  ...asset.toObject(),
  id: asset._id.toString(),
  createdBy: asset.createdBy?.toString?.() ?? null,
})

function outputFormatToMime(f: 'png' | 'jpeg' | 'webp'): string {
  if (f === 'jpeg') {
    return 'image/jpeg'
  }

  if (f === 'webp') {
    return 'image/webp'
  }

  return 'image/png'
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
    const requestId = crypto.randomUUID()
    const started = time()
    const encoder = new TextEncoder()
    const userId = authResult.payload.sub

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (payload: unknown) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        }

        send({ type: 'start', requestId })

        try {
          let completed = false

          for await (const ev of llmService.iterateImageGenerationStream({
            model: imageModel,
            prompt: finalPrompt,
            size: aspect.size,
          })) {
            if (ev.kind === 'partial') {
              send({
                type: 'partial',
                b64: ev.b64Json,
                index: ev.partialImageIndex,
                mime: outputFormatToMime(ev.outputFormat),
              })
            } else if (ev.kind === 'completed') {
              const { b64Json, outputFormat, usage } = ev
              const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat
              const mime = outputFormatToMime(outputFormat)
              const buffer = Buffer.from(b64Json, 'base64')

              const asset = await createMediaAssetFromBuffer({
                buffer,
                filename: `ai-generated-${Date.now()}.${ext}`,
                contentType: mime,
                createdBy: userId,
                resourceType: MediaResourceType.IMAGE,
              })

              try {
                await recordLlmUsageEvent({
                  source: 'image_generate',
                  userId,
                  llmModel: imageModel,
                  usage,
                  articleId,
                  revisionId,
                  requestId,
                })
              } catch (e) {
                logger.error('image_generate usage persist failed', { message: e instanceof Error ? e.message : String(e) })
              }

              const durationMs = time().diff(started, 'milliseconds')

              logger.info('image generate stream completed', {
                requestId,
                durationMs,
                model: imageModel,
                articleId,
                revisionId,
                userId,
              })

              send({
                type: 'done',
                requestId,
                durationMs,
                asset: mapAsset(asset),
                proxyUrl: asset?.proxyPath ?? '',
                usage,
                model: imageModel,
                aspectRatioId: aspect.id,
                promptUsed: finalPrompt,
              })

              completed = true

              break
            }
          }

          if (!completed) {
            send({ type: 'error', message: t('errors.unknown') })
            logger.error('image generate stream ended without completed event', { requestId })
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : t('errors.unknown')

          send({ type: 'error', message })
          logger.error('image generate stream error', { requestId, message })
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

export const POST = withGlobalRateLimit(withAuthMiddleware(handlerPost))
