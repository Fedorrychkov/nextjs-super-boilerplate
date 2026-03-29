import { ClientLlmApi, type LlmUsageDashboardFilter, LlmUsageDashboardResponse } from '~/api/llm'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const LLM_USAGE_DASHBOARD_QUERY_KEY = 'llm-usage-dashboard'

export const buildLlmUsageDashboardQueryKey = (filter: LlmUsageDashboardFilter) => [LLM_USAGE_DASHBOARD_QUERY_KEY, String(filter.days ?? 7)].join('-')

export const useLlmUsageDashboardQuery = (filter: LlmUsageDashboardFilter, enabled = true) => {
  const days = filter.days ?? 7

  return useQueryBuilder<LlmUsageDashboardResponse, Error>({
    key: buildLlmUsageDashboardQueryKey({ days }),
    enabled,
    method: async () => {
      const api = new ClientLlmApi()

      return api.getUsageDashboard({ days })
    },
  })
}
