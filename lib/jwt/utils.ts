import { JWT_CONFIG } from '@config/env'
import jwt from 'jsonwebtoken'

import { JwtPayload } from '~/api/auth/model'

/**
 * Генерация access token
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'exp'>): string {
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: Number(JWT_CONFIG.accessExpiresIn),
  })
}

/**
 * Генерация refresh token
 */
export function generateRefreshToken(payload: Omit<JwtPayload, 'exp'>): string {
  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: Number(JWT_CONFIG.refreshExpiresIn),
  })
}

/**
 * Верификация access token
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_CONFIG.secret) as JwtPayload
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message)
    }

    throw new Error('Invalid or expired access token')
  }
}

/**
 * Верификация refresh token
 */
export function verifyRefreshToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, JWT_CONFIG.secret) as JwtPayload
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message)
    }

    throw new Error('Invalid or expired refresh token')
  }
}

/**
 * Декодирование токена без верификации (для отладки)
 */
export function decodeToken(token: string): JwtPayload | null {
  return jwt.decode(token) as JwtPayload | null
}

/**
 * Получение времени истечения токена в секундах
 */
export function getTokenExpiration(expiresIn: number): number {
  return expiresIn
}
