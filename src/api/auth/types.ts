import { UserRole } from '~/api/user'

export type LoginEmailDto = {
  email: string
  password: string
}

export type RegisterDto = {
  email: string
  password: string
}

export interface RegisterByAdminDto extends RegisterDto {
  role: UserRole
}
