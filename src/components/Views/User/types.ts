import type { PushSubscriptionItemModel, PushSubscriptionPublicItemModel } from '~/api/user'

export type TableItem = PushSubscriptionItemModel | PushSubscriptionPublicItemModel

export type { TableItem as PushSubscriptionTableItem }

export const isAdminPushSubscriptionItem = (item: TableItem): item is PushSubscriptionItemModel => {
  return 'endpoint' in item
}
