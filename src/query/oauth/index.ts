import { useQuery } from 'react-query'

import { ClientOAuthAdminApi } from '~/api/oauth/client'
import type { OAuthAttemptFilter } from '~/api/oauth/types'

import { timeouts } from '../constants'

export const oauthAttemptsQueryKey = (filter: OAuthAttemptFilter) => ['admin', 'oauth-attempts', filter] as const

export const useOAuthAttemptsQuery = (filter: OAuthAttemptFilter, enabled = true) =>
  useQuery(
    oauthAttemptsQueryKey(filter),
    async () => {
      const api = new ClientOAuthAdminApi()

      return api.listAttempts(filter)
    },
    {
      enabled,
      staleTime: timeouts.xs,
      keepPreviousData: true,
    },
  )
