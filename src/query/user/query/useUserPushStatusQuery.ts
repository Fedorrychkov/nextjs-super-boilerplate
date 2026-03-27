import { ClientUserApi, UserPushStatusDto } from '~/api/user'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const useUserPushStatusQuery = (userId?: string, enabled = true) => {
  const key = `user-push-status-${userId ?? 'unknown'}`

  const props = useQueryBuilder<UserPushStatusDto, Error>({
    key,
    enabled: Boolean(userId) && enabled,
    method: async () => {
      const api = new ClientUserApi()
      const result = await api.getUserPushStatus(userId as string)

      return result
    },
  })

  return {
    ...props,
    key,
  }
}
