import { ClientAuthApi } from '~/api/auth'
import type { UserModel } from '~/api/user'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const PROFILE_QUERY_KEY = 'profile'

export const fetchProfile = async (): Promise<Pick<UserModel, 'id' | 'email' | 'role' | 'status'>> => {
  const api = new ClientAuthApi()

  return api.profile()
}

export const useProfileQuery = (enabled = true, onSuccess?: () => void) => {
  const props = useQueryBuilder({
    key: PROFILE_QUERY_KEY,
    enabled,
    method: fetchProfile,
    options: {
      onSuccess: () => {
        onSuccess?.()
      },
    },
  })

  return props
}
