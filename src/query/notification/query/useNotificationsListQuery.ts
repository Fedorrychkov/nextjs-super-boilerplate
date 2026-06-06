import { ClientNotificationApi, PlatformNotificationFilter, PlatformNotificationModel } from '~/api/notification'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'
import { PaginationMeta } from '~/types'
import { jsonStringifySafety } from '~/utils/jsonSafe'

export const NOTIFICATIONS_LIST_QUERY_KEY = 'notifications-list'

export const fetchNotifications =
  (mode: 'mine' | 'admin', filter: Partial<PlatformNotificationFilter>) => async (): Promise<PaginationMeta<PlatformNotificationModel>> => {
    const api = new ClientNotificationApi()

    if (mode === 'admin') {
      return api.listAdmin(filter)
    }

    return api.listMine(filter)
  }

export const useNotificationsListQuery = (mode: 'mine' | 'admin', filter: Partial<PlatformNotificationFilter>, enabled = true) => {
  return useQueryBuilder({
    key: [NOTIFICATIONS_LIST_QUERY_KEY, mode, jsonStringifySafety(filter)].join('-'),
    enabled,
    method: fetchNotifications(mode, filter),
  })
}
