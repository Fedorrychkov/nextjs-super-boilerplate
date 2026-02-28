'use client'

import { ClientAuthApi } from '~/api/auth'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const useRefreshTokenQuery = (enabled = true) => {
  const key = 'refreshToken'

  const props = useQueryBuilder({
    key,
    enabled,
    method: async () => {
      if (!enabled) {
        return null
      }

      const api = new ClientAuthApi()
      const result = await api.refreshToken()

      return result
    },
    options: {
      retryDelay: 1000 * 60 * 1, // 1 minute
      refetchIntervalInBackground: true,
      refetchInterval: 1000 * 60 * 5, // 5 minutes
    },
  })

  return {
    ...props,
    key,
  }
}
