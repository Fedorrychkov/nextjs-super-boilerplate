/** OpenAI / chat model id exposed to the client (allowlist). */
export type LlmModelOption = {
  id: string
  label: string
}

export type LlmModelsResponse = {
  enabled: boolean
  chat: { models: LlmModelOption[] }
  audit: { models: LlmModelOption[] }
}

export type LlmTokenUsage = {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export type LlmPersistedChatMessage = {
  role: 'user' | 'assistant'
  content: string
  createdAt: string
  model?: string | null
}

export type LlmChatHistoryResponse = {
  sessionId: string | null
  messages: LlmPersistedChatMessage[]
}

export type ArticleAuditSection = {
  score?: number
  summary: string
  strengths: string[]
  issues: string[]
  recommendations: string[]
}

export type ArticleAuditResult = {
  preview: ArticleAuditSection
  content: ArticleAuditSection
  seo: ArticleAuditSection
  overall?: string
}

export type ArticleAuditApiResponse = {
  audit: ArticleAuditResult
  usage?: LlmTokenUsage
  model: string
  /** Set when audit row was saved to MongoDB. */
  savedId?: string
}

export type ArticleAuditListItem = {
  id: string
  audit: ArticleAuditResult
  model: string
  usage: LlmTokenUsage | null
  createdAt: string
}

export type ArticleAuditListResponse = {
  items: ArticleAuditListItem[]
}
