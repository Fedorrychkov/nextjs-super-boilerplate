import { ClientLlmApi, type LlmArticleUsageFilter, LlmArticleUsageResponse } from '~/api/llm'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const LLM_ARTICLE_USAGE_QUERY_KEY = 'llm-article-usage'

export const buildLlmArticleUsageQueryKey = (filter: LlmArticleUsageFilter) => [LLM_ARTICLE_USAGE_QUERY_KEY, filter.articleId, filter.revisionId].join('-')

export const useLlmArticleUsageQuery = (filter: LlmArticleUsageFilter | null, enabled: boolean) => {
  const key = filter ? buildLlmArticleUsageQueryKey(filter) : `${LLM_ARTICLE_USAGE_QUERY_KEY}-disabled`

  return useQueryBuilder<LlmArticleUsageResponse, Error>({
    key,
    enabled: enabled && !!filter,
    method: async () => {
      const api = new ClientLlmApi()

      return api.getArticleUsage(filter!)
    },
  })
}
