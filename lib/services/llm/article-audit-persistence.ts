import LlmArticleAudit from '@lib/db/models/LlmArticleAudit'
import mongoose from 'mongoose'

import type { ArticleAuditResult } from '~/api/llm'
import { time } from '~/utils/time'

import { type LlmUsageNumbers, recordLlmUsageEvent } from './llm-usage-persistence'

export type PersistedArticleAuditRow = {
  id: string
  audit: ArticleAuditResult
  model: string
  usage: LlmUsageNumbers | null
  createdAt: string
}

function toAuditResult(raw: unknown): ArticleAuditResult {
  return raw as ArticleAuditResult
}

export async function saveArticleAuditRun(params: {
  articleId: string
  revisionId: string
  userId: string
  audit: ArticleAuditResult
  model: string
  usage: LlmUsageNumbers | undefined
}): Promise<{ id: string }> {
  const doc = await LlmArticleAudit.create({
    articleId: new mongoose.Types.ObjectId(params.articleId),
    revisionId: new mongoose.Types.ObjectId(params.revisionId),
    userId: params.userId,
    audit: params.audit as unknown as Record<string, unknown>,
    llmModel: params.model,
    usage: params.usage ?? null,
    createdAt: time().toISOString(),
  })

  const id = doc._id.toString()

  if (params.usage) {
    await recordLlmUsageEvent({
      source: 'article_audit',
      userId: params.userId,
      llmModel: params.model,
      usage: params.usage,
      articleId: params.articleId,
      revisionId: params.revisionId,
      articleAuditId: id,
    })
  }

  return { id }
}

export async function listArticleAuditsForRevision(params: {
  articleId: string
  revisionId: string
  userId: string
  limit?: number
}): Promise<PersistedArticleAuditRow[]> {
  const limit = Math.min(params.limit ?? 50, 100)

  const rows = await LlmArticleAudit.find({
    articleId: new mongoose.Types.ObjectId(params.articleId),
    revisionId: new mongoose.Types.ObjectId(params.revisionId),
    userId: params.userId,
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean()

  return rows.map((r) => ({
    id: String(r._id),
    audit: toAuditResult(r.audit),
    model: r.llmModel,
    usage: r.usage
      ? {
          promptTokens: r.usage.promptTokens,
          completionTokens: r.usage.completionTokens,
          totalTokens: r.usage.totalTokens,
        }
      : null,
    createdAt: r.createdAt,
  }))
}
