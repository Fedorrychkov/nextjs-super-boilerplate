import type { AuthUserSnapshot, UserRole, UserStatus } from '../user'

export type JwtPayload = {
  sub: string
  email: string
  role: UserRole
  status: UserStatus | null
  /** RefreshToken document id — binds access JWT to a revocable server session */
  sid?: string
  /** `access` | `refresh`; absent on tokens issued before the claim (lib/jwt/token-type.ts). */
  typ?: 'access' | 'refresh'
  iat?: number
  exp?: number
}

export type AuthResponse = {
  accessToken: string
  refreshToken: string
  expiresIn: number
  refreshExpiresIn: number
  user: AuthUserSnapshot
}
