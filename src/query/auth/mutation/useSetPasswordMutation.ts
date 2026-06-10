import { useMutation } from 'react-query'

import { ClientAuthApi } from '~/api/auth/client'

export const useSetPasswordMutation = () => {
  const setPasswordMutation = useMutation(async (body: { newPassword: string; totpCode?: string }) => {
    const api = new ClientAuthApi()

    return api.setPassword(body)
  })

  return { setPasswordMutation }
}
