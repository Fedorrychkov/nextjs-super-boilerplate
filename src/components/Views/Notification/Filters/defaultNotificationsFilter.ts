import { NotificationDeliveryStatus, PlatformNotificationType } from '~/api/notification'
import type { FilterOption } from '~/types'

export type DefaultNotificationsFiltersKeys = 'deliveryStatus' | 'type'

export const DefaultNotificationsFilters: Record<DefaultNotificationsFiltersKeys, FilterOption> = {
  deliveryStatus: {
    value: null,
    options: Object.values(NotificationDeliveryStatus).map((status) => ({
      value: status,
      label: status,
      labelLocalizationKey: `platformNotifications.deliveryStatus.${status}`,
    })),
  },
  type: {
    value: null,
    options: Object.values(PlatformNotificationType).map((type) => ({
      value: type,
      label: type,
      labelLocalizationKey: `platformNotifications.type.${type}`,
    })),
  },
}

export const NOTIFICATIONS_PARAM_NAMES = {
  deliveryStatus: 'platformNotifications.filters.deliveryStatus',
  type: 'platformNotifications.filters.type',
} as const
