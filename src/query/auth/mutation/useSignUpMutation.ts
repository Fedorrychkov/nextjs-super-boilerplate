import { useMutation } from 'react-query'

import { ClientAuthApi } from '~/api/auth'
import { RegisterDto } from '~/api/auth/types'

export const useSignUpMutation = () => {
  const signUpMutation = useMutation(async (data: RegisterDto) => {
    const api = new ClientAuthApi()

    const response = await api.signUp(data)

    return response
  })

  return { signUpMutation }
}
