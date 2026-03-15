import { useMutation, useQueryClient } from 'react-query'

import { ClientAuthApi } from '~/api/auth'

import { MFA_STATUS_QUERY_KEY } from '../query/useMfaStatusQuery'

export const useMfaSetupMutation = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation(async () => {
    const api = new ClientAuthApi()

    return api.mfaSetup()
  })

  const mutateAsync = async () => {
    const result = await mutation.mutateAsync()
    queryClient.invalidateQueries(MFA_STATUS_QUERY_KEY)

    return result
  }

  return { ...mutation, mutateAsync }
}
