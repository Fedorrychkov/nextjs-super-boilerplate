'use client'

import { useMutation } from 'react-query'

import { ClientAuthApi } from '~/api/auth/client'

export const usePasswordForgotMutation = () => {
  const startMutation = useMutation(async (body: { email: string }) => {
    const api = new ClientAuthApi()

    return api.startPasswordForgot(body)
  })

  const completeMutation = useMutation(
    async (body: { pendingId: string; newPassword: string; emailCode?: string; totp?: string; flexibleFactor?: 'email' | 'totp' }) => {
      const api = new ClientAuthApi()

      return api.completePasswordForgot(body)
    },
  )

  return { startMutation, completeMutation }
}
