import mongoose, { type Document, type Model, Schema } from 'mongoose'

import { time } from '~/utils/time'

/** All server-side LLM calls that report token usage — for admin cost / usage monitoring. */
export type LlmUsageSource = 'chat_stream' | 'article_audit' | 'seo_suggest' | 'preview_suggest' | 'content_suggest'

export interface ILlmUsageEvent extends Document {
  source: LlmUsageSource
  userId: string
  articleId?: mongoose.Types.ObjectId
  revisionId?: mongoose.Types.ObjectId
  llmModel: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  /** LlmChatSession id when source is chat_stream */
  sessionId?: mongoose.Types.ObjectId
  /** LlmArticleAudit id when source is article_audit */
  articleAuditId?: mongoose.Types.ObjectId
  requestId?: string
  createdAt: string
}

const LlmUsageEventSchema = new Schema<ILlmUsageEvent>(
  {
    source: {
      type: String,
      enum: ['chat_stream', 'article_audit', 'seo_suggest', 'preview_suggest', 'content_suggest'],
      required: true,
      index: true,
    },
    userId: { type: String, required: true, index: true },
    articleId: { type: Schema.Types.ObjectId, ref: 'Article', index: true },
    revisionId: { type: Schema.Types.ObjectId, ref: 'ArticleRevision', index: true },
    llmModel: { type: String, required: true },
    promptTokens: { type: Number, required: true },
    completionTokens: { type: Number, required: true },
    totalTokens: { type: Number, required: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'LlmChatSession' },
    articleAuditId: { type: Schema.Types.ObjectId, ref: 'LlmArticleAudit' },
    requestId: { type: String },
    createdAt: { type: String, default: () => time().toISOString(), index: true },
  },
  { versionKey: false },
)

LlmUsageEventSchema.index({ userId: 1, createdAt: -1 })
LlmUsageEventSchema.index({ source: 1, createdAt: -1 })
LlmUsageEventSchema.index({ articleId: 1, revisionId: 1, createdAt: -1 })

export type ILlmUsageEventModel = Model<ILlmUsageEvent>

const LlmUsageEvent = (mongoose.models.LlmUsageEvent as ILlmUsageEventModel) || mongoose.model<ILlmUsageEvent>('LlmUsageEvent', LlmUsageEventSchema)

export default LlmUsageEvent
