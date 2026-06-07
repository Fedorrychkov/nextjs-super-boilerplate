import { ClientUserApi } from '~/api/user'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const USER_PUSH_SUBSCRIPTIONS_QUERY_KEY = 'user-push-subscriptions'

export const fetchUserPushSubscriptions = (userId: string) => async () => {
  const api = new ClientUserApi()

  return api.getUserPushSubscriptions(userId)
}

export const useUserPushSubscriptionsQuery = (userId: string, enabled = true) => {
  return useQueryBuilder({
    key: [USER_PUSH_SUBSCRIPTIONS_QUERY_KEY, userId].join('-'),
    enabled: enabled && Boolean(userId),
    method: fetchUserPushSubscriptions(userId),
  })
}
