import { ClientAuthApi } from '~/api/auth/client'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const RECOVERY_CAPABILITIES_QUERY_KEY = 'recovery-capabilities'

export type RecoveryCapabilities = {
  platformEmailAvailable: boolean
  strictness: 'strict' | 'flexible'
  passwordChangeEnabled: boolean
  passwordForgotEnabled: boolean
  userMfaEnabled?: boolean
  allowedFactors?: Array<'email' | 'totp'>
  requiredFactors?: Array<'email' | 'totp'>
  selfServicePossible?: boolean
}

export const fetchRecoveryCapabilities = () => async () => {
  const api = new ClientAuthApi()

  return api.getRecoveryCapabilities() as Promise<RecoveryCapabilities>
}

export const useRecoveryCapabilitiesQuery = (enabled = true) => {
  return useQueryBuilder({
    key: RECOVERY_CAPABILITIES_QUERY_KEY,
    enabled,
    method: fetchRecoveryCapabilities(),
  })
}
