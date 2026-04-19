import { AxiosHeaders } from 'axios'
import { useMutation } from 'react-query'

import { ClientAuthApi } from '~/api/auth'
import { RegisterDto, SignUpCompleteDto } from '~/api/auth/types'

function localeHeaders(): AxiosHeaders | undefined {
  if (typeof navigator === 'undefined') {
    return undefined
  }

  return new AxiosHeaders({ 'Accept-Language': navigator.language })
}

export const useSignUpMutation = () => {
  const signUpRequestMutation = useMutation(async (data: RegisterDto) => {
    const api = new ClientAuthApi()

    return api.signUpRequest(data, localeHeaders())
  })

  const signUpCompleteMutation = useMutation(async (data: SignUpCompleteDto) => {
    const api = new ClientAuthApi()

    return api.signUpComplete(data, localeHeaders())
  })

  return { signUpRequestMutation, signUpCompleteMutation }
}
