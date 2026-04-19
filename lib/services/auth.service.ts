import { JWT_CONFIG } from '@config/env'
import connectDB from '@lib/db/client'
import RefreshToken from '@lib/db/models/RefreshToken'
import User, { IUser } from '@lib/db/models/User'
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '@lib/error/custom-errors'
import { generateAccessToken, generateRefreshToken, getTokenExpiration, verifyRefreshToken } from '@lib/jwt/utils'
import type { HydratedDocument } from 'mongoose'

import { AuthResponse } from '~/api/auth/model'
import { LoginEmailDto, RegisterByAdminDto, RegisterDto } from '~/api/auth/types'
import { AuthUserSnapshot, UserRole, UserStatus } from '~/api/user'
import { TFunction } from '~/lib/i18n'

export class AuthService {
  private async updateUserLanguage(userId: string, languageCode?: string | null): Promise<void> {
    if (!languageCode) {
      return
    }

    await User.updateOne({ _id: userId }, { $set: { languageCode } })
  }

  /**
   * Registration of a user
   */
  async register(data: RegisterDto, isAdmin: boolean = false, options?: { languageCode?: string | null; t: TFunction }): Promise<AuthResponse> {
    await connectDB()

    const existingUser = await User.findOne({ email: data.email.toLowerCase() })

    if (existingUser) {
      throw new ValidationError(options?.t?.('auth.errors.userWithThisEmailAlreadyExists') ?? 'User with this email already exists')
    }

    const user = await User.create({
      email: data.email.toLowerCase(),
      role: isAdmin ? UserRole.ADMIN : UserRole.USER,
      status: UserStatus.ACTIVE,
      password: data.password,
      languageCode: options?.languageCode ?? null,
    })

    return this.generateAuthResponse(user, options)
  }

  /**
   * Create user after email OTP; `passwordHash` is bcrypt — must not be re-hashed (see User pre-save `$locals.skipPasswordHash`).
   */
  async registerWithVerifiedPasswordHash(
    data: { email: string; passwordHash: string },
    options?: { languageCode?: string | null; t: TFunction },
  ): Promise<AuthResponse> {
    await connectDB()

    const email = data.email.toLowerCase()
    const existingUser = await User.findOne({ email })

    if (existingUser) {
      throw new ValidationError(options?.t?.('auth.errors.userWithThisEmailAlreadyExists') ?? 'User with this email already exists')
    }

    const user = new User({
      email,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      password: data.passwordHash,
      languageCode: options?.languageCode ?? null,
    })
    const hydrated = user as HydratedDocument<IUser>

    hydrated.$locals = { ...hydrated.$locals, skipPasswordHash: true }
    await user.save()

    return this.generateAuthResponse(user, options)
  }

  async registerByAdmin(data: RegisterByAdminDto, t: TFunction): Promise<AuthUserSnapshot> {
    await connectDB()

    const existingUser = await User.findOne({ email: data.email.toLowerCase() })

    if (existingUser) {
      throw new ValidationError(t('auth.errors.userWithThisEmailAlreadyExists'))
    }

    const isValidRole = Object.values(UserRole).includes(data.role)

    if (!isValidRole) {
      throw new ValidationError(t('auth.errors.invalidRole'))
    }

    const user = await User.create({
      email: data.email.toLowerCase(),
      role: data.role,
      status: UserStatus.ACTIVE,
      password: data.password,
    })

    return {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    }
  }

  async login(data: LoginEmailDto, options?: { languageCode?: string | null }): Promise<AuthResponse> {
    const user = await this.validateUserCredentials(data)

    return this.generateAuthResponse(user, options)
  }

  async refreshTokens(refreshTokenString: string): Promise<AuthResponse> {
    await connectDB()

    const payload = verifyRefreshToken(refreshTokenString)

    const storedToken = await RefreshToken.findOne({
      token: refreshTokenString,
      userId: payload.sub,
    })

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token')
    }

    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: storedToken._id })
      throw new UnauthorizedError('Refresh token expired')
    }

    const user = await User.findById(payload.sub)

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundError('User not found or inactive')
    }

    await RefreshToken.deleteOne({ _id: storedToken._id })

    return this.generateAuthResponse(user)
  }

  async logout(refreshTokenString: string, userId: string): Promise<void> {
    await connectDB()

    await RefreshToken.deleteOne({
      token: refreshTokenString,
      userId,
    })
  }

  async logoutAll(userId: string): Promise<void> {
    await connectDB()

    await RefreshToken.deleteMany({ userId })
  }

  async validateUserCredentials(data: LoginEmailDto): Promise<IUser> {
    await connectDB()

    const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password')

    if (!user) {
      throw new ValidationError('Invalid email or password')
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenError('User account is blocked')
    }

    const isPasswordValid = await user.comparePassword(data.password)

    if (!isPasswordValid) {
      throw new ValidationError('Invalid email or password')
    }

    return user
  }

  private async generateAuthResponse(user: IUser, options?: { languageCode?: string | null }): Promise<AuthResponse> {
    await connectDB()
    await this.updateUserLanguage(user._id.toString(), options?.languageCode)

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
    }

    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    const expiresIn = getTokenExpiration(Number(JWT_CONFIG.refreshExpiresIn))
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt,
    })

    const accessExpiresIn = getTokenExpiration(Number(JWT_CONFIG.accessExpiresIn))

    return {
      accessToken,
      refreshToken,
      expiresIn: accessExpiresIn,
      refreshExpiresIn: expiresIn,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
        status: user.status,
      },
    }
  }

  async createAuthTokensForUser(user: IUser, options?: { languageCode?: string | null }): Promise<AuthResponse> {
    return this.generateAuthResponse(user, options)
  }
}

export const authService = new AuthService()
