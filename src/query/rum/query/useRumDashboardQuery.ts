import { ClientRumApi } from '~/api/rum/client'
import { RumDashboardPayload, RumFilter } from '~/api/rum/types'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const RUM_DASHBOARD_QUERY_KEY = 'rum-dashboard'

export const fetchRumDashboard = (filter: RumFilter) => async (): Promise<RumDashboardPayload> => {
  const api = new ClientRumApi()

  return api.getDashboard(filter)
}

export const useRumDashboardQuery = (filter: RumFilter, enabled = true) => {
  return useQueryBuilder({
    key: [RUM_DASHBOARD_QUERY_KEY, String(filter.days), filter.pathname].join('-'),
    enabled,
    method: fetchRumDashboard(filter),
  })
}
