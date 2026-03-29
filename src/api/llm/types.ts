export type LlmChatHistoryFilter = {
  articleId: string
  revisionId: string
}

/** Same shape as chat history — audits are scoped per article + revision + user. */
export type LlmArticleAuditListFilter = {
  articleId: string
  revisionId: string
}

export type ArticleAuditDto = {
  articleId: string
  revisionId: string
  model?: string
}

/** Same body shape as article audit — scoped article + revision + optional model. */
export type SeoSuggestDto = ArticleAuditDto

export type PreviewSuggestDto = ArticleAuditDto

export type ContentSuggestDto = ArticleAuditDto

export type LlmChatStreamMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type LlmChatStreamDto = {
  articleId: string
  revisionId: string
  model: string
  messages: LlmChatStreamMessage[]
}

export type LlmUsageDashboardFilter = {
  days?: number
}

export type LlmArticleUsageFilter = {
  articleId: string
  revisionId: string
}

export type LlmImageGenerateDto = {
  articleId: string
  revisionId: string
  imageModel?: string
  aspectRatioId?: string
  promptSource: 'custom' | 'fromArticle'
  prompt?: string
}

export type LlmImagePromptStreamDto = {
  articleId: string
  revisionId: string
  model?: string
}
