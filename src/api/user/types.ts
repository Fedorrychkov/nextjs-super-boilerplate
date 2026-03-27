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
