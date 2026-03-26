import { ClientAiReferralsApi } from '~/api/ai-referrals/client'
import { AiReferralDashboardPayload, AiRefferralFilter } from '~/api/ai-referrals/types'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const AI_REFERRALS_DASHBOARD_QUERY_KEY = 'ai-referrals-dashboard'

export const fetchAiReferralsDashboard = (filter: AiRefferralFilter) => async (): Promise<AiReferralDashboardPayload> => {
  const api = new ClientAiReferralsApi()

  return api.getDashboard(filter)
}

export const useAiReferralsDashboardQuery = (filter: AiRefferralFilter, enabled = true) => {
  return useQueryBuilder({
    key: [AI_REFERRALS_DASHBOARD_QUERY_KEY, String(filter.days), filter.pathname, filter.source].join('-'),
    enabled,
    method: fetchAiReferralsDashboard(filter),
  })
}
