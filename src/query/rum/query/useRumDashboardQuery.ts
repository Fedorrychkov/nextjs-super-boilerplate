import { ClientRumApi } from '~/api/rum/client'
import { RumDashboardPayload } from '~/api/rum/types'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const RUM_DASHBOARD_QUERY_KEY = 'rum-dashboard'

export const fetchRumDashboard = (days: number) => async (): Promise<RumDashboardPayload> => {
  const api = new ClientRumApi()

  return api.getDashboard(days)
}

export const useRumDashboardQuery = (days: number, enabled = true) => {
  return useQueryBuilder({
    key: [RUM_DASHBOARD_QUERY_KEY, String(days)].join('-'),
    enabled,
    method: fetchRumDashboard(days),
  })
}
