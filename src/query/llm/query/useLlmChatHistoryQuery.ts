import { ClientLlmApi, type LlmChatHistoryFilter, LlmChatHistoryResponse } from '~/api/llm'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const LLM_CHAT_HISTORY_QUERY_KEY = 'llm-chat-history'

export const buildLlmChatHistoryQueryKey = (filter: LlmChatHistoryFilter) => [LLM_CHAT_HISTORY_QUERY_KEY, filter.articleId, filter.revisionId].join('-')

export const useLlmChatHistoryQuery = (filter: LlmChatHistoryFilter | null, enabled: boolean) => {
  const key = filter ? buildLlmChatHistoryQueryKey(filter) : `${LLM_CHAT_HISTORY_QUERY_KEY}-disabled`

  return useQueryBuilder<LlmChatHistoryResponse, Error>({
    key,
    enabled: enabled && !!filter,
    method: async () => {
      const api = new ClientLlmApi()

      return api.getChatHistory(filter!)
    },
  })
}
