import connectDB from '@lib/db/client'
import OAuthAccount, { type IOAuthAccount } from '@lib/db/models/OAuthAccount'
import User, { type IUser } from '@lib/db/models/User'

import type { OAuthProviderId, OAuthPublicAccountModel } from '~/api/oauth'
import { UserRole, UserStatus } from '~/api/user'

import type { OAuthProfile, OAuthTokenSet } from './types'

export async function findOAuthAccount(provider: OAuthProviderId, providerUserId: string) {
  await connectDB()

  return OAuthAccount.findOne({ provider, providerUserId })
}

export async function listOAuthAccountsForUser(userId: string): Promise<OAuthPublicAccountModel[]> {
  await connectDB()

  const rows = await OAuthAccount.find({ userId }).sort({ linkedAt: -1 }).lean()

  return rows.map((row) => ({
    provider: row.provider as OAuthProviderId,
    providerLogin: row.providerLogin ?? null,
    providerEmail: row.providerEmail ?? null,
    linkedAt: row.linkedAt ? new Date(row.linkedAt).toISOString() : null,
    lastUsedAt: row.lastUsedAt ? new Date(row.lastUsedAt).toISOString() : null,
  }))
}

export async function userHasPassword(userId: string): Promise<boolean> {
  await connectDB()

  const user = await User.findById(userId).select('+password')

  return Boolean(user?.password)
}

export async function countOAuthAccountsForUser(userId: string): Promise<number> {
  await connectDB()

  return OAuthAccount.countDocuments({ userId })
}

export async function createOAuthAccount(params: {
  userId: string
  provider: OAuthProviderId
  profile: OAuthProfile
  tokens?: OAuthTokenSet
  scopes?: string[]
}): Promise<IOAuthAccount> {
  await connectDB()

  return OAuthAccount.create({
    userId: params.userId,
    provider: params.provider,
    providerUserId: params.profile.providerUserId,
    providerEmail: params.profile.email ?? null,
    providerLogin: params.profile.login ?? null,
    scopes: params.scopes ?? [],
    tokenExpiresAt: params.tokens?.expiresIn ? new Date(Date.now() + params.tokens.expiresIn * 1000) : null,
    linkedAt: new Date(),
    lastUsedAt: new Date(),
  })
}

export async function touchOAuthAccount(account: IOAuthAccount, profile?: OAuthProfile): Promise<void> {
  account.lastUsedAt = new Date()

  if (profile?.email) {
    account.providerEmail = profile.email
  }

  if (profile?.login) {
    account.providerLogin = profile.login
  }

  await account.save()
}

export async function deleteOAuthAccountForUser(userId: string, provider: OAuthProviderId): Promise<boolean> {
  await connectDB()

  const result = await OAuthAccount.deleteOne({ userId, provider })

  return result.deletedCount > 0
}

export async function createOAuthUser(params: { email: string; languageCode?: string | null }): Promise<IUser> {
  await connectDB()

  return User.create({
    email: params.email.toLowerCase(),
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    password: null,
    emailOrigin: 'oauth',
    languageCode: params.languageCode ?? null,
  })
}

export type OAuthFlowContext = {
  flow: import('~/api/oauth').OAuthFlow
  provider: OAuthProviderId
  profile: OAuthProfile
  tokens: OAuthTokenSet
  scopes: string[]
  actorUserId?: string | null
  languageCode?: string | null
  ip?: string | null
  userAgent?: string | null
}
