import { useMutation, useQuery, useQueryClient } from 'react-query'

import type { MachineAccessBlockPayload, MachineAccessUserDetail, MachineAccessUserRow } from '~/api/machine-access'
import { ClientMachineAccessApi } from '~/api/machine-access'
import type { PaginationMeta } from '~/types/pagination'

import { timeouts } from '../constants'

export const machineAccessUsersQueryKey = (limit: number, offset: number) => ['admin', 'machine-access', 'users', limit, offset] as const
export const machineAccessUserDetailQueryKey = (userId: string) => ['admin', 'machine-access', 'user', userId] as const

export const useMachineAccessUsersQuery = (params: { limit: number; offset: number }, enabled = true) =>
  useQuery<PaginationMeta<MachineAccessUserRow>, Error>(
    machineAccessUsersQueryKey(params.limit, params.offset),
    async () => {
      const api = new ClientMachineAccessApi()

      return api.users(params)
    },
    {
      enabled,
      staleTime: timeouts.xs,
      keepPreviousData: true,
    },
  )

export const useMachineAccessUserDetailQuery = (userId: string | null) =>
  useQuery<MachineAccessUserDetail, Error>(
    machineAccessUserDetailQueryKey(userId ?? 'none'),
    async () => {
      const api = new ClientMachineAccessApi()

      return api.userDetail(userId as string)
    },
    {
      enabled: Boolean(userId),
      staleTime: timeouts.xs,
    },
  )

export const useMachineAccessBlockMutation = () => {
  const queryClient = useQueryClient()

  const machineAccessBlockMutation = useMutation<{ userId: string; blocked: boolean }, Error, MachineAccessBlockPayload>(
    async (payload) => {
      const api = new ClientMachineAccessApi()

      return api.setBlocked(payload)
    },
    {
      onSuccess: (_, payload) => {
        queryClient.invalidateQueries(['admin', 'machine-access'])
        queryClient.invalidateQueries(machineAccessUserDetailQueryKey(payload.userId))
      },
    },
  )

  return { machineAccessBlockMutation }
}
