import { ArticleAuditListResponse, ClientLlmApi, type LlmArticleAuditListFilter } from '~/api/llm'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const LLM_ARTICLE_AUDITS_QUERY_KEY = 'llm-article-audits'

export const buildLlmArticleAuditsQueryKey = (filter: LlmArticleAuditListFilter) =>
  [LLM_ARTICLE_AUDITS_QUERY_KEY, filter.articleId, filter.revisionId].join('-')

export const useLlmArticleAuditsQuery = (filter: LlmArticleAuditListFilter | null, enabled: boolean) => {
  const key = filter ? buildLlmArticleAuditsQueryKey(filter) : `${LLM_ARTICLE_AUDITS_QUERY_KEY}-disabled`

  return useQueryBuilder<ArticleAuditListResponse, Error>({
    key,
    enabled: enabled && !!filter,
    method: async () => {
      const api = new ClientLlmApi()

      return api.listArticleAudits(filter!)
    },
  })
}
