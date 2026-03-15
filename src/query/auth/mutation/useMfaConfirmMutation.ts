import { useMutation, useQueryClient } from 'react-query'

import { ClientAuthApi } from '~/api/auth'

import { MFA_STATUS_QUERY_KEY } from '../query/useMfaStatusQuery'

export const useMfaConfirmMutation = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation(async (code: string) => {
    const api = new ClientAuthApi()

    return api.mfaConfirm({ code })
  })

  const mutateAsync = async (code: string) => {
    const result = await mutation.mutateAsync(code)
    queryClient.invalidateQueries(MFA_STATUS_QUERY_KEY)

    return result
  }

  return { ...mutation, mutateAsync }
}
