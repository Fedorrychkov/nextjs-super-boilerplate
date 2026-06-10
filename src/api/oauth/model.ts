import type { OAuthProviderId } from '@config/auth-oauth'

export type { OAuthProviderId }

export type OAuthFlow = 'signIn' | 'signUp' | 'link'

export type EmailOrigin = 'credentials' | 'oauth' | 'admin'

export type EmailTrust = 'native' | 'external' | 'disputed'

export type OAuthAttemptOutcome = 'success' | 'email_collision' | 'provider_taken' | 'not_found' | 'error'

export type OAuthAccountModel = {
  id: string
  userId: string
  provider: OAuthProviderId
  providerUserId: string
  providerEmail?: string | null
  providerLogin?: string | null
  scopes?: string[]
  linkedAt?: string | null
  lastUsedAt?: string | null
}

export type OAuthPublicAccountModel = Pick<OAuthAccountModel, 'provider' | 'providerLogin' | 'providerEmail' | 'linkedAt' | 'lastUsedAt'>
