import { useQuery } from 'react-query'

import type { SecurityAuditFilter } from '~/api/security-audit'
import { ClientSecurityAuditApi } from '~/api/security-audit'

import { timeouts } from '../constants'

export const securityAuditQueryKey = (filter: SecurityAuditFilter) => ['admin', 'security-audit', filter] as const

export const useSecurityAuditQuery = (filter: SecurityAuditFilter, enabled = true) =>
  useQuery(
    securityAuditQueryKey(filter),
    async () => {
      const api = new ClientSecurityAuditApi()

      return api.list(filter)
    },
    {
      enabled,
      staleTime: timeouts.xs,
      keepPreviousData: true,
    },
  )
