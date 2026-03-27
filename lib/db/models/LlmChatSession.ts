import mongoose, { type Document, type Model, Schema } from 'mongoose'

import { time } from '~/utils/time'

export interface ILlmChatSession extends Document {
  articleId: mongoose.Types.ObjectId
  revisionId: mongoose.Types.ObjectId
  /** JWT `sub` (user id string) */
  userId: string
  updatedAt: string
  createdAt: string
}

const LlmChatSessionSchema = new Schema<ILlmChatSession>(
  {
    articleId: { type: Schema.Types.ObjectId, ref: 'Article', required: true, index: true },
    revisionId: { type: Schema.Types.ObjectId, ref: 'ArticleRevision', required: true, index: true },
    userId: { type: String, required: true, index: true },
    createdAt: { type: String, default: () => time().toISOString() },
    updatedAt: { type: String, default: () => time().toISOString() },
  },
  { versionKey: false },
)

LlmChatSessionSchema.index({ articleId: 1, revisionId: 1, userId: 1 }, { unique: true })

export type ILlmChatSessionModel = Model<ILlmChatSession>

const LlmChatSession = (mongoose.models.LlmChatSession as ILlmChatSessionModel) || mongoose.model<ILlmChatSession>('LlmChatSession', LlmChatSessionSchema)

export default LlmChatSession
