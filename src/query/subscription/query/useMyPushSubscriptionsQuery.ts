import { ClientSubscriptionApi } from '~/api/subscription'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const MY_PUSH_SUBSCRIPTIONS_QUERY_KEY = 'my-push-subscriptions'

export const fetchMyPushSubscriptions = (currentEndpoint?: string | null) => async () => {
  const api = new ClientSubscriptionApi()

  return api.listSubscriptions(currentEndpoint)
}

export const useMyPushSubscriptionsQuery = (currentEndpoint?: string | null, enabled = true) => {
  return useQueryBuilder({
    key: `${MY_PUSH_SUBSCRIPTIONS_QUERY_KEY}:${currentEndpoint ?? ''}`,
    enabled,
    method: fetchMyPushSubscriptions(currentEndpoint),
  })
}
