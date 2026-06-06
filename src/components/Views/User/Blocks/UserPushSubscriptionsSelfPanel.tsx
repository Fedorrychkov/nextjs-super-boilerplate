'use client'

import { Typography } from '~/components/ui'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { usePush } from '~/providers/push'
import { useDeleteMyPushSubscriptionMutation, useMyPushSubscriptionsQuery } from '~/query/subscription'

import { UserPushSubscriptionsTable } from '../List/UserPushSubscriptionsTable'

export const UserPushSubscriptionsSelfPanel = () => {
  const t = useT()
  const { notify } = useNotify()
  const { currentEndpoint, unsubscribe } = usePush()
  const { data, isLoading, refetch } = useMyPushSubscriptionsQuery(currentEndpoint)
  const { deleteMyPushSubscriptionMutation } = useDeleteMyPushSubscriptionMutation()

  const handleDelete = async (item: { id: string }) => {
    if (!window.confirm(t('user.adminProfile.pushSubscriptions.deleteConfirm'))) {
      return
    }

    try {
      await deleteMyPushSubscriptionMutation.mutateAsync({ id: item.id })
      await refetch()
      notify(t('user.adminProfile.pushSubscriptions.deleted'), 'success')
    } catch {
      notify(t('user.adminProfile.pushSubscriptions.deleteFailed'), 'destructive')
    }
  }

  const handleUnsubscribeCurrent = async () => {
    if (!window.confirm(t('user.profile.pushSubscriptions.revokeDeviceConfirm'))) {
      return
    }

    try {
      await unsubscribe()
      await refetch()
      notify(t('notification.ui.unsubscribe'), 'success')
    } catch {
      notify(t('notification.errors.errorSubscribingToNotifications'), 'destructive')
    }
  }

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 space-y-4">
      <Typography variant="heading-3">{t('user.profile.pushSubscriptions.title')}</Typography>
      <UserPushSubscriptionsTable
        items={data?.list}
        isLoading={isLoading}
        onDelete={handleDelete}
        deletingId={deleteMyPushSubscriptionMutation.isLoading ? deleteMyPushSubscriptionMutation.variables?.id : null}
        allowCurrentDeviceActions
        onUnsubscribeCurrent={handleUnsubscribeCurrent}
      />
    </div>
  )
}
