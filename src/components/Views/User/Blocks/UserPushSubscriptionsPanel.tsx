'use client'

import { useState } from 'react'

import { Typography } from '~/components/ui'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useDeleteUserPushSubscriptionMutation } from '~/query/user/mutation'
import { useUserPushSubscriptionsQuery } from '~/query/user/query'

import { UserPushSubscriptionsTable } from '../List/UserPushSubscriptionsTable'
import { isAdminPushSubscriptionItem, type PushSubscriptionTableItem } from '../types'

type Props = {
  userId: string
}

export const UserPushSubscriptionsPanel = ({ userId }: Props) => {
  const t = useT()
  const { notify } = useNotify()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { data, isLoading, refetch } = useUserPushSubscriptionsQuery(userId, Boolean(userId))
  const { deleteUserPushSubscriptionMutation } = useDeleteUserPushSubscriptionMutation()

  const handleDelete = async (item: PushSubscriptionTableItem) => {
    if (!isAdminPushSubscriptionItem(item)) {
      return
    }

    if (!window.confirm(t('user.adminProfile.pushSubscriptions.deleteConfirm'))) {
      return
    }

    try {
      setDeletingId(item.id)
      await deleteUserPushSubscriptionMutation.mutateAsync({ userId, endpoint: item.endpoint })
      await refetch()
      notify(t('user.adminProfile.pushSubscriptions.deleted'), 'success')
    } catch {
      notify(t('user.adminProfile.pushSubscriptions.deleteFailed'), 'destructive')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Typography variant="Body/S/Semibold">{t('user.adminProfile.pushSubscriptions.title')}</Typography>
      <UserPushSubscriptionsTable items={data?.list} isLoading={isLoading} onDelete={handleDelete} deletingId={deletingId} showSensitiveDetails />
    </div>
  )
}
