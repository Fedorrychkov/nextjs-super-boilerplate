import { ClientUserApi, UserMfaStatusDto } from '~/api/user'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const useUserMfaStatusQuery = (userId?: string, enabled = true) => {
  const key = `user-mfa-status-${userId ?? 'unknown'}`

  const props = useQueryBuilder<UserMfaStatusDto, Error>({
    key,
    enabled: Boolean(userId) && enabled,
    method: async () => {
      const api = new ClientUserApi()
      const result = await api.getUserMfaStatus(userId as string)

      return result
    },
  })

  return {
    ...props,
    key,
  }
}
