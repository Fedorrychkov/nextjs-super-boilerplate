import LlmChatMessage, { type LlmMessageUsage } from '@lib/db/models/LlmChatMessage'
import LlmChatSession from '@lib/db/models/LlmChatSession'
import mongoose from 'mongoose'

import { time } from '~/utils/time'

export async function findOrCreateSession(params: { articleId: string; revisionId: string; userId: string }): Promise<{ id: string }> {
  const { articleId, revisionId, userId } = params

  const aid = new mongoose.Types.ObjectId(articleId)
  const rid = new mongoose.Types.ObjectId(revisionId)
  const updatedAt = time().toISOString()

  const doc = await LlmChatSession.findOneAndUpdate(
    { articleId: aid, revisionId: rid, userId },
    {
      $set: { updatedAt },
      $setOnInsert: {
        articleId: aid,
        revisionId: rid,
        userId,
        createdAt: updatedAt,
      },
    },
    { upsert: true, new: true },
  )

  return { id: doc._id.toString() }
}

export async function appendChatTurn(params: {
  sessionId: string
  userContent: string
  assistantContent: string
  model: string
  usage: LlmMessageUsage | null
}): Promise<void> {
  const { sessionId, userContent, assistantContent, model, usage } = params

  const sid = new mongoose.Types.ObjectId(sessionId)
  const t0 = time().toISOString()
  const t1 = time().add(1, 'millisecond').toISOString()

  await LlmChatMessage.insertMany([
    {
      sessionId: sid,
      role: 'user',
      content: userContent.slice(0, 120_000),
      llmModel: null,
      usage: null,
      createdAt: t0,
    },
    {
      sessionId: sid,
      role: 'assistant',
      content: assistantContent.slice(0, 120_000),
      llmModel: model,
      usage: usage ?? undefined,
      createdAt: t1,
    },
  ])

  await LlmChatSession.updateOne({ _id: sid }, { $set: { updatedAt: time().toISOString() } })
}

export type PersistedChatMessage = {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  model?: string | null
}

export async function listChatMessages(sessionId: string): Promise<PersistedChatMessage[]> {
  const sid = new mongoose.Types.ObjectId(sessionId)

  const rows = await LlmChatMessage.find({ sessionId: sid }).sort({ createdAt: 1 }).lean()

  return rows.map((r) => ({
    role: r.role as 'user' | 'assistant',
    content: r.content,
    createdAt: r.createdAt,
    model: r.llmModel ?? null,
  }))
}

export async function findSessionIdForArticle(params: { articleId: string; revisionId: string; userId: string }): Promise<string | null> {
  const doc = await LlmChatSession.findOne({
    articleId: new mongoose.Types.ObjectId(params.articleId),
    revisionId: new mongoose.Types.ObjectId(params.revisionId),
    userId: params.userId,
  })
    .select('_id')
    .lean()

  return doc?._id ? String(doc._id) : null
}
