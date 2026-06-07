import { JWT_CONFIG } from '@config/env'
import connectDB from '@lib/db/client'
import RefreshToken, { IRefreshToken } from '@lib/db/models/RefreshToken'
import User, { IUser } from '@lib/db/models/User'
import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from '@lib/error/custom-errors'
import { generateAccessToken, generateRefreshToken, getTokenExpiration, verifyAccessToken, verifyRefreshToken } from '@lib/jwt/utils'
import { assertActiveAccessSession, inheritedSessionMeta, sessionMetaFromRequest } from '@lib/services/user-session.service'
import type { RequestClientMeta } from '@lib/utils/request-client-meta'
import { assertPasswordPolicy } from '@lib/validation/password-policy'
import mongoose, { type HydratedDocument } from 'mongoose'

import { AuthResponse } from '~/api/auth/model'
import { LoginEmailDto, RegisterByAdminDto, RegisterDto } from '~/api/auth/types'
import { AuthUserSnapshot, UserRole, UserStatus } from '~/api/user'
import { TFunction } from '~/lib/i18n'

type AuthSessionOptions = {
  languageCode?: string | null
  clientMeta?: RequestClientMeta | null
}

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
  async register(
    data: RegisterDto,
    isAdmin: boolean = false,
    options?: { languageCode?: string | null; clientMeta?: RequestClientMeta | null; t: TFunction },
  ): Promise<AuthResponse> {
    await connectDB()

    const existingUser = await User.findOne({ email: data.email.toLowerCase() })

    if (existingUser) {
      throw new ValidationError(options?.t?.('auth.errors.userWithThisEmailAlreadyExists') ?? 'User with this email already exists')
    }

    if (options?.t) {
      assertPasswordPolicy(data.password, options.t)
    }

    const user = await User.create({
      email: data.email.toLowerCase(),
      role: isAdmin ? UserRole.ADMIN : UserRole.USER,
      status: UserStatus.ACTIVE,
      password: data.password,
      languageCode: options?.languageCode ?? null,
    })

    return this.generateAuthResponse(user, { languageCode: options?.languageCode, clientMeta: options?.clientMeta })
  }

  /**
   * Create user after email OTP; `passwordHash` is bcrypt — must not be re-hashed (see User pre-save `$locals.skipPasswordHash`).
   */
  async registerWithVerifiedPasswordHash(
    data: { email: string; passwordHash: string },
    options?: { languageCode?: string | null; clientMeta?: RequestClientMeta | null; t: TFunction },
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

    return this.generateAuthResponse(user, { languageCode: options?.languageCode, clientMeta: options?.clientMeta })
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

    assertPasswordPolicy(data.password, t)

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

  async login(data: LoginEmailDto, options: AuthSessionOptions & { t: TFunction }): Promise<AuthResponse> {
    const user = await this.validateUserCredentials(data, options.t)

    return this.generateAuthResponse(user, { languageCode: options?.languageCode, clientMeta: options?.clientMeta })
  }

  async refreshTokens(refreshTokenString: string, options?: AuthSessionOptions): Promise<AuthResponse> {
    const { user, storedToken } = await this.validateRefreshToken(refreshTokenString)

    return this.rotateRefreshToken(user, storedToken, options)
  }

  /**
   * Verify access token signature and ensure user still exists and is active.
   * Reusable server-side auth check (guards, server actions) without internal HTTP call.
   */
  async validateAccessToken(accessToken: string): Promise<IUser> {
    await connectDB()

    const payload = verifyAccessToken(accessToken)

    await assertActiveAccessSession(payload)

    const user = await User.findById(payload.sub)

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundError('User not found or inactive')
    }

    return user
  }

  /**
   * Verify refresh token signature + presence in DB token store + user status.
   * This matches refresh endpoint semantics and can be reused from guards.
   */
  async validateRefreshToken(refreshTokenString: string): Promise<{
    user: IUser
    storedToken: IRefreshToken
  }> {
    await connectDB()

    const payload = verifyRefreshToken(refreshTokenString)
    const storedToken = await RefreshToken.findOne({
      token: refreshTokenString,
      userId: payload.sub,
    })

    if (!storedToken) {
      throw new UnauthorizedError('Invalid refresh token')
    }

    if (payload.sid && payload.sid !== storedToken._id.toString()) {
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

    return { user, storedToken }
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

  async validateUserCredentials(data: LoginEmailDto, t: TFunction): Promise<IUser> {
    await connectDB()

    const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password')

    if (!user) {
      throw new ValidationError(t('auth.errors.invalidEmailOrPassword'))
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenError(t('auth.errors.userAccountIsBlocked'))
    }

    const isPasswordValid = await user.comparePassword(data.password)

    if (!isPasswordValid) {
      throw new ValidationError(t('auth.errors.invalidEmailOrPassword'))
    }

    return user
  }

  private async rotateRefreshToken(user: IUser, storedToken: IRefreshToken, options?: AuthSessionOptions): Promise<AuthResponse> {
    await connectDB()
    await this.updateUserLanguage(user._id.toString(), options?.languageCode)

    const sid = storedToken._id.toString()
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
      sid,
    }

    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    const expiresIn = getTokenExpiration(Number(JWT_CONFIG.refreshExpiresIn))
    const expiresAt = new Date(Date.now() + expiresIn * 1000)
    const sessionMeta = inheritedSessionMeta(storedToken)

    await RefreshToken.updateOne(
      { _id: storedToken._id },
      {
        $set: {
          token: refreshToken,
          expiresAt,
          lastSeenAt: sessionMeta.lastSeenAt,
        },
      },
    )

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

  private async generateAuthResponse(user: IUser, options?: AuthSessionOptions): Promise<AuthResponse> {
    await connectDB()
    await this.updateUserLanguage(user._id.toString(), options?.languageCode)

    const sessionId = new mongoose.Types.ObjectId()
    const sid = sessionId.toString()
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      status: user.status,
      sid,
    }

    const accessToken = generateAccessToken(payload)
    const refreshToken = generateRefreshToken(payload)

    const expiresIn = getTokenExpiration(Number(JWT_CONFIG.refreshExpiresIn))
    const expiresAt = new Date(Date.now() + expiresIn * 1000)
    const sessionMeta = sessionMetaFromRequest(options?.clientMeta)

    await RefreshToken.create({
      _id: sessionId,
      token: refreshToken,
      userId: user._id,
      expiresAt,
      deviceLabel: sessionMeta.deviceLabel,
      userAgent: sessionMeta.userAgent,
      ip: sessionMeta.ip,
      lastSeenAt: sessionMeta.lastSeenAt,
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

  async createAuthTokensForUser(user: IUser, options?: AuthSessionOptions): Promise<AuthResponse> {
    return this.generateAuthResponse(user, { languageCode: options?.languageCode, clientMeta: options?.clientMeta })
  }
}

export const authService = new AuthService()
