'use client'

import { useMutation } from 'react-query'

import { ClientAuthApi } from '~/api/auth/client'

export const usePasswordChangeMutation = () => {
  const requestMutation = useMutation(async (body: { currentPassword: string; newPassword: string }) => {
    const api = new ClientAuthApi()

    return api.requestPasswordChange(body)
  })

  const confirmMutation = useMutation(async (body: { pendingId: string; emailCode?: string; totp?: string; flexibleFactor?: 'email' | 'totp' }) => {
    const api = new ClientAuthApi()

    return api.confirmPasswordChange(body)
  })

  return { requestMutation, confirmMutation }
}
