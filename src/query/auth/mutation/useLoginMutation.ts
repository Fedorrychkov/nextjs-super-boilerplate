import { useMutation } from 'react-query'

import { ClientAuthApi } from '~/api/auth'
import { LoginEmailDto } from '~/api/auth/types'

export const useLoginMutation = () => {
  const loginMutation = useMutation(async ({ email, password }: LoginEmailDto) => {
    const api = new ClientAuthApi()

    const response = await api.login({
      email,
      password,
    })

    return response
  })

  return { loginMutation }
}
