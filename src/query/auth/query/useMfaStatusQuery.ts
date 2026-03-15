import { ClientAuthApi } from '~/api/auth'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const MFA_STATUS_QUERY_KEY = 'mfa-status'

const fetchMfaStatus = async (): Promise<{ mfaEnabled: boolean }> => {
  const api = new ClientAuthApi()

  return api.mfaStatus()
}

export const useMfaStatusQuery = (enabled: boolean) => {
  return useQueryBuilder({
    key: MFA_STATUS_QUERY_KEY,
    enabled,
    method: fetchMfaStatus,
  })
}
