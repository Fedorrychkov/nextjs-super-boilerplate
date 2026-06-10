import { useMutation } from 'react-query'

import { ClientAuthApi } from '~/api/auth/client'
import type { OAuthProviderId } from '~/api/oauth'

export const useOAuthUnlinkMutation = () => {
  const unlinkMutation = useMutation(async (provider: OAuthProviderId) => {
    const api = new ClientAuthApi()

    return api.unlinkOAuthProvider(provider)
  })

  return { unlinkMutation }
}
