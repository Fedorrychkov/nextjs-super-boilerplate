import { useMutation, useQuery } from 'react-query'

import { ClientOnboardingApi, ClientSessionApi } from '~/api/account/client'

import { timeouts } from '../constants'

const sessionsQueryKey = ['auth', 'sessions'] as const
const onboardingQueryKey = ['user', 'onboarding'] as const

export const useSessionsQuery = (enabled = true) =>
  useQuery(
    sessionsQueryKey,
    async () => {
      const api = new ClientSessionApi()

      return api.listSessions()
    },
    {
      enabled,
      staleTime: timeouts.xs,
    },
  )

export const useRevokeSessionMutation = () => {
  const revokeSessionMutation = useMutation(async (id: string) => {
    const api = new ClientSessionApi()

    return api.revokeSession(id)
  })

  const revokeOtherSessionsMutation = useMutation(async () => {
    const api = new ClientSessionApi()

    return api.revokeOtherSessions()
  })

  return { revokeSessionMutation, revokeOtherSessionsMutation }
}

export const useUserSessionsAdminQuery = (userId: string, enabled = true) =>
  useQuery(
    [...sessionsQueryKey, 'admin', userId],
    async () => {
      const api = new ClientSessionApi()

      return api.listUserSessionsAdmin(userId)
    },
    {
      enabled: enabled && Boolean(userId),
      staleTime: timeouts.xs,
    },
  )

export const useRevokeUserSessionAdminMutation = () => {
  const revokeUserSessionAdminMutation = useMutation(async ({ userId, sessionId }: { userId: string; sessionId: string }) => {
    const api = new ClientSessionApi()

    return api.revokeUserSessionAdmin(userId, sessionId)
  })

  const revokeAllUserSessionsAdminMutation = useMutation(async (userId: string) => {
    const api = new ClientSessionApi()

    return api.revokeAllUserSessionsAdmin(userId)
  })

  return { revokeUserSessionAdminMutation, revokeAllUserSessionsAdminMutation }
}

export const useOnboardingQuery = (enabled = true) =>
  useQuery(
    onboardingQueryKey,
    async () => {
      const api = new ClientOnboardingApi()

      return api.getState()
    },
    {
      enabled,
      staleTime: timeouts.xs,
    },
  )

export const useOnboardingMutation = () => {
  const completeStepMutation = useMutation(async (stepId: 'profile' | 'mfa' | 'push') => {
    const api = new ClientOnboardingApi()

    return api.completeStep(stepId)
  })

  const dismissMutation = useMutation(async () => {
    const api = new ClientOnboardingApi()

    return api.dismiss()
  })

  return { completeStepMutation, dismissMutation }
}
