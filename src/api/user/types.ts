import { UserModel } from './model'

export enum SortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export type UserFilter = Partial<Omit<UserModel, 'passwordHash' | 'createdAt' | 'updatedAt'>> & {
  sortBy?: SortBy | null
  sortOrder?: SortOrder | null
  limit?: number | null
  offset?: number | null
  startOfDateIso?: string | null
  endOfDateIso?: string | null
}

export type UpdateUserDto = Partial<Omit<UserModel, 'passwordHash' | 'createdAt' | 'updatedAt' | 'email'>>

export type UserPushStatusDto = {
  hasPushSubscription: boolean
}

export type PushSubscriptionProvider = 'apple' | 'fcm' | 'mozilla' | 'unknown'

/** User-facing list item — no endpoint or browser metadata. */
export type PushSubscriptionPublicItemModel = {
  id: string
  provider: PushSubscriptionProvider
  createdAt: string | null
  updatedAt: string | null
  isCurrent: boolean
}

/** Admin list item — includes endpoint and user-agent for support. */
export type PushSubscriptionItemModel = {
  id: string
  userId: string
  endpoint: string
  userAgent: string | null
  provider: PushSubscriptionProvider
  createdAt: string | null
  updatedAt: string | null
}

export type PushSubscriptionsListResponse = {
  list: PushSubscriptionItemModel[]
}

export type PushSubscriptionsPublicListResponse = {
  list: PushSubscriptionPublicItemModel[]
}

export type UserMfaStatusDto = {
  mfaEnabled: boolean
}
