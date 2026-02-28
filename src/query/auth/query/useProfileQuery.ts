import { ClientAuthApi } from '~/api/auth'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const useProfileQuery = (enabled = true) => {
  const key = 'profile'

  const props = useQueryBuilder({
    key,
    enabled,
    method: async () => {
      const api = new ClientAuthApi()
      const result = await api.profile()

      return result
    },
  })

  return {
    ...props,
    key,
  }
}
