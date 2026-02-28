'use client'

import { ClientAuthApi } from '~/api/auth'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const useLogoutQuery = (enabled = true) => {
  const key = 'logout'

  const props = useQueryBuilder({
    key,
    enabled,
    method: async () => {
      if (enabled) {
        const api = new ClientAuthApi()
        await api.logout()

        return true
      }

      return false
    },
  })

  return {
    ...props,
    key,
  }
}
