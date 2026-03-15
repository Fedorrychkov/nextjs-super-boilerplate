import { useMutation } from 'react-query'

import { ClientAuthApi } from '~/api/auth'

type LoginMfaBody = {
  challengeId: string
  code: string
}

export const useLoginMfaMutation = () => {
  const mutation = useMutation(async (body: LoginMfaBody) => {
    const api = new ClientAuthApi()

    return api.loginMfa(body)
  })

  return { loginMfaMutation: mutation }
}
