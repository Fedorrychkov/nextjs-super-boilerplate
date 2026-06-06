'use client'

import { useMutation } from 'react-query'

import { ClientSubscriptionApi } from '~/api/subscription'

export const useDeleteMyPushSubscriptionMutation = () => {
  const deleteMyPushSubscriptionMutation = useMutation(async ({ id }: { id: string }) => {
    const api = new ClientSubscriptionApi()

    await api.deleteSubscription({ id })
  })

  return { deleteMyPushSubscriptionMutation }
}
