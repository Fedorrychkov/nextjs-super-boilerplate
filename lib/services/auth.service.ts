import { JWT_CONFIG } from '@config/env'
import connectDB from '@lib/db/client'
import RefreshToken from '@lib/db/models/RefreshToken'
import User, { IUser } from '@lib/db/models/User'
import { generateAccessToken, generateRefreshToken, getTokenExpiration, verifyRefreshToken } from '@lib/jwt/utils'

import { AuthResponse } from '~/api/auth/model'
import { LoginEmailDto, RegisterDto } from '~/api/auth/types'
import { UserRole, UserStatus } from '~/api/user'

export class AuthService {
  /**
   * Registration of a user
   */
  async register(data: RegisterDto): Promise<AuthResponse> {
    await connectDB()

    const existingUser = await User.findOne({ email: data.email.toLowerCase() })

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    const user = await User.create({
      email: data.email.toLowerCase(),
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      password: data.password,
    })

    return this.generateAuthResponse(user)
  }

  async login(data: LoginEmailDto): Promise<AuthResponse> {
    await connectDB()

    const user = await User.findOne({ email: data.email.toLowerCase() }).select('+password')

    if (!user) {
      throw new Error('Invalid email or password')
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('User account is blocked')
    }

    const isPasswordValid = await user.comparePassword(data.password)

    if (!isPasswordValid) {
      throw new Error('Invalid email or password')
    }

    return this.generateAuthResponse(user)
  }

  async refreshTokens(refreshTokenString: string): Promise<AuthResponse> {
    await connectDB()

    const payload = verifyRefreshToken(refreshTokenString)

    const storedToken = await RefreshToken.findOne({
      token: refreshTokenString,
      userId: payload.sub,
    })

    if (!storedToken) {
      throw new Error('Invalid refresh token')
    }

    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: storedToken._id })
      throw new Error('Refresh token expired')
    }

    const user = await User.findById(payload.sub)

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new Error('User not found or inactive')
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

  private async generateAuthResponse(user: IUser): Promise<AuthResponse> {
    await connectDB()

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
}

export const authService = new AuthService()
