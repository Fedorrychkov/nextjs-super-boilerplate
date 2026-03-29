import mongoose, { type Document, type Model, Schema } from 'mongoose'

import { time } from '~/utils/time'

export interface ILlmArticleAudit extends Document {
  articleId: mongoose.Types.ObjectId
  revisionId: mongoose.Types.ObjectId
  userId: string
  /** Parsed JSON audit payload (preview / content / seo / overall). */
  audit: Record<string, unknown>
  llmModel: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  } | null
  createdAt: string
}

const LlmArticleAuditSchema = new Schema<ILlmArticleAudit>(
  {
    articleId: { type: Schema.Types.ObjectId, ref: 'Article', required: true, index: true },
    revisionId: { type: Schema.Types.ObjectId, ref: 'ArticleRevision', required: true, index: true },
    userId: { type: String, required: true, index: true },
    audit: { type: Schema.Types.Mixed, required: true },
    llmModel: { type: String, required: true },
    usage: { type: Schema.Types.Mixed, default: null },
    createdAt: { type: String, default: () => time().toISOString(), index: true },
  },
  { versionKey: false },
)

LlmArticleAuditSchema.index({ articleId: 1, revisionId: 1, userId: 1, createdAt: -1 })

export type ILlmArticleAuditModel = Model<ILlmArticleAudit>

const LlmArticleAudit = (mongoose.models.LlmArticleAudit as ILlmArticleAuditModel) || mongoose.model<ILlmArticleAudit>('LlmArticleAudit', LlmArticleAuditSchema)

export default LlmArticleAudit
