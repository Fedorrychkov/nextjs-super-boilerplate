import type { OAuthFlow, OAuthProviderId } from '~/api/oauth'

export type OAuthTokenSet = {
  accessToken: string
  refreshToken?: string | null
  expiresIn?: number | null
  tokenType?: string | null
  scope?: string | null
}

export type OAuthProfile = {
  providerUserId: string
  email?: string | null
  emailVerified?: boolean
  name?: string | null
  avatarUrl?: string | null
  login?: string | null
}

export type OAuthAuthorizeParams = {
  redirectUri: string
  state: string
  codeChallenge?: string
  scopes: string[]
  flow: OAuthFlow
}

export interface OAuthProviderAdapter {
  id: OAuthProviderId
  displayName: string
  usesPkce: boolean
  /** GitHub OAuth App allows a single Authorization callback URL — use /callback for all flows */
  singleRedirectUri?: boolean
  defaultSignInScopes: string[]
  defaultLinkScopes: string[]
  getAuthorizationUrl(params: OAuthAuthorizeParams): string
  exchangeCode(params: {
    code: string
    redirectUri: string
    codeVerifier?: string
    /** VK ID returns device_id in callback query — required for token exchange */
    deviceId?: string
    state?: string
  }): Promise<OAuthTokenSet>
  getProfile(tokens: OAuthTokenSet): Promise<OAuthProfile>
}
