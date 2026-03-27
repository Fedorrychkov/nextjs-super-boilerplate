export type LlmChatHistoryFilter = {
  articleId: string
  revisionId: string
}

export type ArticleAuditDto = {
  articleId: string
  revisionId: string
  model?: string
}

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
