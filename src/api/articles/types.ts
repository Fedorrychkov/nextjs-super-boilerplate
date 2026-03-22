import { UserModel } from './model'

export type UserFilter = Partial<Omit<UserModel, 'passwordHash' | 'createdAt' | 'updatedAt'>> & {
  limit?: number | null
  offset?: number | null
  startOfDateIso?: string | null
  endOfDateIso?: string | null
}
