import { useMutation, useQuery, useQueryClient } from 'react-query'

import type {
  ApiTokenCreatedModel,
  ApiTokenCreatePayload,
  ApiTokenFilter,
  ApiTokenModel,
  ApiTokenPermissionsModel,
  ApiTokenRolePolicyModel,
  ApiTokenRolePolicyUpdatePayload,
} from '~/api/api-token'
import { ClientApiTokenApi } from '~/api/api-token'

import { timeouts } from '../constants'

export const apiTokenPermissionsQueryKey = ['api-tokens', 'permissions'] as const
export const apiTokenPoliciesQueryKey = ['admin', 'api-tokens', 'policies'] as const

export const useApiTokenPermissionsQuery = (enabled = true) =>
  useQuery<ApiTokenPermissionsModel, Error>(
    apiTokenPermissionsQueryKey,
    async () => {
      const api = new ClientApiTokenApi()

      return api.permissions()
    },
    {
      enabled,
      staleTime: timeouts.md,
    },
  )

export const useApiTokenPoliciesQuery = (enabled = true) =>
  useQuery<{ list: ApiTokenRolePolicyModel[] }, Error>(
    apiTokenPoliciesQueryKey,
    async () => {
      const api = new ClientApiTokenApi()

      return api.policyList()
    },
    {
      enabled,
      staleTime: timeouts.xs,
    },
  )

export const useApiTokenPolicyUpdateMutation = () => {
  const queryClient = useQueryClient()

  const apiTokenPolicyUpdateMutation = useMutation<ApiTokenRolePolicyModel, Error, ApiTokenRolePolicyUpdatePayload>(
    async (payload) => {
      const api = new ClientApiTokenApi()

      return api.policyUpdate(payload)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(apiTokenPoliciesQueryKey)
        queryClient.invalidateQueries(apiTokenPermissionsQueryKey)
      },
    },
  )

  return { apiTokenPolicyUpdateMutation }
}

export const apiTokensQueryKey = (filter: ApiTokenFilter) => ['admin', 'api-tokens', filter] as const

export const useApiTokensQuery = (filter: ApiTokenFilter, enabled = true) =>
  useQuery(
    apiTokensQueryKey(filter),
    async () => {
      const api = new ClientApiTokenApi()

      return api.list(filter)
    },
    {
      enabled,
      staleTime: timeouts.xs,
      keepPreviousData: true,
    },
  )

export const useApiTokenCreateMutation = () => {
  const queryClient = useQueryClient()

  const apiTokenCreateMutation = useMutation<ApiTokenCreatedModel, Error, ApiTokenCreatePayload>(
    async (payload) => {
      const api = new ClientApiTokenApi()

      return api.create(payload)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin', 'api-tokens'])
      },
    },
  )

  return { apiTokenCreateMutation }
}

export const useApiTokenRevokeMutation = () => {
  const queryClient = useQueryClient()

  const apiTokenRevokeMutation = useMutation<ApiTokenModel, Error, string>(
    async (id) => {
      const api = new ClientApiTokenApi()

      return api.revoke(id)
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['admin', 'api-tokens'])
      },
    },
  )

  return { apiTokenRevokeMutation }
}
