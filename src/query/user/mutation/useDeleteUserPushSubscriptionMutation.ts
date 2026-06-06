'use client'

import { useMutation } from 'react-query'

import { ClientUserApi } from '~/api/user'

export const useDeleteUserPushSubscriptionMutation = () => {
  const deleteUserPushSubscriptionMutation = useMutation(async ({ userId, endpoint }: { userId: string; endpoint: string }) => {
    const api = new ClientUserApi()

    await api.deleteUserPushSubscription(userId, endpoint)
  })

  return { deleteUserPushSubscriptionMutation }
}
