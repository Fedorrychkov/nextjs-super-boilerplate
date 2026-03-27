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

export type LlmUsageSourceKind = 'chat_stream' | 'article_audit'

export type LlmUsageTotalsPayload = {
  eventCount: number
  totalPromptTokens: number
  totalCompletionTokens: number
  totalTokens: number
}

export type LlmUsageBySourcePayload = {
  source: LlmUsageSourceKind
  count: number
  totalTokens: number
}

export type LlmUsageTopUserPayload = {
  userId: string
  eventCount: number
  totalTokens: number
}

export type LlmUsageRecentEventPayload = {
  id: string
  source: LlmUsageSourceKind
  userId: string
  llmModel: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  articleId: string | null
  revisionId: string | null
  createdAt: string
}

export type LlmUsageDashboardResponse = {
  since: string
  until: string
  days: number
  totals: LlmUsageTotalsPayload
  bySource: LlmUsageBySourcePayload[]
  topUsers: LlmUsageTopUserPayload[]
  recent: LlmUsageRecentEventPayload[]
}

export type LlmArticleUsageResponse = {
  totals: LlmUsageTotalsPayload
  bySource: LlmUsageBySourcePayload[]
}
