import { ClientUserApi } from '~/api/user'
import { cacheTimes, useQueryBuilder } from '~/hooks/useQueryBuilder'

export const useUserQuery = (
  userId: string,
  enabled = true,
  options?: {
    refetchOnWindowFocus?: boolean
    staleTime?: number
    cacheTime?: number
  },
) => {
  const { refetchOnWindowFocus = true, staleTime = cacheTimes.large, cacheTime = cacheTimes.large } = options ?? {}

  const key = `user-${userId}`

  const props = useQueryBuilder({
    key,
    enabled,
    method: async () => {
      const api = new ClientUserApi()
      const result = await api.getUser(userId)

      return result
    },
    options: {
      retry: 0,
      refetchOnWindowFocus,
      ...(staleTime !== undefined && { staleTime }),
      ...(cacheTime !== undefined && { cacheTime }),
    },
  })

  return {
    ...props,
    key,
  }
}
