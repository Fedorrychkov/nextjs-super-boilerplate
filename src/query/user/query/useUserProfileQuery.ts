import { ClientUserApi } from '~/api/user'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const useUserProfileQuery = (enabled = true) => {
  const key = 'user-current-profile'

  const props = useQueryBuilder({
    key,
    enabled,
    method: async () => {
      const api = new ClientUserApi()
      const result = await api.getProfile()

      return result
    },
  })

  return {
    ...props,
    key,
  }
}
