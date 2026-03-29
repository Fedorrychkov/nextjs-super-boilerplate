import mongoose, { type Document, type Model, Schema } from 'mongoose'

import { time } from '~/utils/time'

export type LlmChatMessageRole = 'user' | 'assistant'

export interface LlmMessageUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ILlmChatMessage extends Document {
  sessionId: mongoose.Types.ObjectId
  role: LlmChatMessageRole
  content: string
  /** LLM model id (assistant rows); avoid `model` — conflicts with Mongoose Document#model */
  llmModel?: string | null
  usage?: LlmMessageUsage | null
  createdAt: string
}

const LlmChatMessageSchema = new Schema<ILlmChatMessage>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: 'LlmChatSession', required: true, index: true },
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true, maxlength: 120_000 },
    llmModel: { type: String, default: null },
    usage: { type: Schema.Types.Mixed, default: null },
    createdAt: { type: String, default: () => time().toISOString() },
  },
  { versionKey: false },
)

LlmChatMessageSchema.index({ sessionId: 1, createdAt: 1 })

export type ILlmChatMessageModel = Model<ILlmChatMessage>

const LlmChatMessage = (mongoose.models.LlmChatMessage as ILlmChatMessageModel) || mongoose.model<ILlmChatMessage>('LlmChatMessage', LlmChatMessageSchema)

export default LlmChatMessage
