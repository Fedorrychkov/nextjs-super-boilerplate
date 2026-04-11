import { useInfiniteQuery, useQuery } from 'react-query'

import { ClientAiReferralsApi } from '~/api/ai-referrals/client'

export const useAiReferralPathnameVisitsInfinite = (pathname: string | null, days: number, enabled: boolean) => {
  return useInfiniteQuery(
    ['ai-referrals-pathname-visits', pathname, String(days)],
    ({ pageParam }) => {
      const api = new ClientAiReferralsApi()

      if (!pathname) {
        throw new Error('pathname is required')
      }

      return api.getPathnameVisits({ pathname, days, cursor: pageParam ?? null })
    },
    {
      enabled: Boolean(pathname) && enabled,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      refetchOnWindowFocus: false,
      retry: 0,
    },
  )
}

export const useAiReferralPathnameQueryStats = (pathname: string | null, days: number, enabled: boolean) => {
  return useQuery(
    ['ai-referrals-pathname-query-stats', pathname, String(days)],
    async () => {
      const api = new ClientAiReferralsApi()

      if (!pathname) {
        throw new Error('pathname is required')
      }

      return api.getPathnameQueryStats({ pathname, days })
    },
    {
      enabled: Boolean(pathname) && enabled,
      refetchOnWindowFocus: false,
      retry: 0,
    },
  )
}
