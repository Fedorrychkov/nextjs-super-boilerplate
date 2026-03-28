import LlmUsageEvent, { type LlmUsageSource } from '@lib/db/models/LlmUsageEvent'
import mongoose from 'mongoose'

import { time } from '~/utils/time'

export type LlmUsageNumbers = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * Append-only log of token usage for every LLM feature — used for admin cost monitoring and aggregates.
 */
export async function recordLlmUsageEvent(params: {
  source: LlmUsageSource
  userId: string
  llmModel: string
  usage: LlmUsageNumbers
  articleId?: string
  revisionId?: string
  sessionId?: string
  articleAuditId?: string
  requestId?: string
}): Promise<void> {
  await LlmUsageEvent.create({
    source: params.source,
    userId: params.userId,
    articleId: params.articleId ? new mongoose.Types.ObjectId(params.articleId) : undefined,
    revisionId: params.revisionId ? new mongoose.Types.ObjectId(params.revisionId) : undefined,
    llmModel: params.llmModel,
    promptTokens: params.usage.promptTokens,
    completionTokens: params.usage.completionTokens,
    totalTokens: params.usage.totalTokens,
    sessionId: params.sessionId ? new mongoose.Types.ObjectId(params.sessionId) : undefined,
    articleAuditId: params.articleAuditId ? new mongoose.Types.ObjectId(params.articleAuditId) : undefined,
    requestId: params.requestId,
    createdAt: time().toISOString(),
  })
}
