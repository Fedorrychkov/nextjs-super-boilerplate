import { useMutation, useQueryClient } from 'react-query'

import { ClientAuthApi } from '~/api/auth'

import { MFA_STATUS_QUERY_KEY } from '../query/useMfaStatusQuery'

type DisableBody = {
  password: string
  code?: string
}

export const useMfaDisableMutation = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation(async (body: DisableBody) => {
    const api = new ClientAuthApi()

    return api.mfaDisable(body)
  })

  const mutateAsync = async (body: DisableBody) => {
    const result = await mutation.mutateAsync(body)
    queryClient.invalidateQueries(MFA_STATUS_QUERY_KEY)

    return result
  }

  return { ...mutation, mutateAsync }
}
