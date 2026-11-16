import { useMutation, useQuery, useQueryClient } from 'react-query'

import { ClientPlatformSettingsApi } from '~/api/platform-settings'

import { timeouts } from '../constants'

export const platformSettingsQueryKey = ['admin', 'platform-settings'] as const

export const usePlatformSettingsQuery = () => useQuery(platformSettingsQueryKey, async () => new ClientPlatformSettingsApi().list(), { staleTime: timeouts.xs })

export const useUpdatePlatformSettingMutation = () => {
  const queryClient = useQueryClient()

  return useMutation(async ({ key, value }: { key: string; value: unknown }) => new ClientPlatformSettingsApi().update(key, value), {
    onSuccess: () => queryClient.invalidateQueries(platformSettingsQueryKey),
  })
}
