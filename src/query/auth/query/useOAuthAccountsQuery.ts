import { ClientAuthApi } from '~/api/auth/client'
import type { OAuthProviderId, OAuthPublicAccountModel } from '~/api/oauth'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const OAUTH_ACCOUNTS_QUERY_KEY = 'oauth-accounts'

export type OAuthAccountsResponse = {
  accounts: OAuthPublicAccountModel[]
  hasPassword: boolean
  oauthCount: number
  linkProviders: OAuthProviderId[]
  uiMode: string
}

export const fetchOAuthAccounts = () => async (): Promise<OAuthAccountsResponse> => {
  const api = new ClientAuthApi()

  return api.getOAuthAccounts()
}

export const useOAuthAccountsQuery = (enabled = true) => {
  return useQueryBuilder({
    key: OAUTH_ACCOUNTS_QUERY_KEY,
    enabled,
    method: fetchOAuthAccounts(),
  })
}
