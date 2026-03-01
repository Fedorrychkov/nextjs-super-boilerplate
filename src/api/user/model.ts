export type UserModel = {
  id: string
  role: UserRole
  passwordHash?: string | null
  email: string
  status: UserStatus
  createdAt?: string | null
  updatedAt?: string | null
}

export enum UserStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
}

export enum UserRole {
  ADMIN = 'admin',
  /**
   * Regular user, has no admin access
   */
  USER = 'user',
}
