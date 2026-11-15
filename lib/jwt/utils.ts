import { randomUUID } from 'node:crypto'

import { JWT_CONFIG } from '@config/env'
import jwt from 'jsonwebtoken'

import { JwtPayload } from '~/api/auth/model'

import { TokenType, tokenTypeOf } from './token-type'

/** Pin the signing/verification algorithm to prevent algorithm-confusion attacks (e.g. `alg: none` or HS/RS confusion). */
const JWT_ALGORITHM = 'HS256' as const

function assertTokenType(payload: JwtPayload, expected: TokenType): JwtPayload {
  if (tokenTypeOf(payload, Number(JWT_CONFIG.accessExpiresIn)) !== expected) {
    throw new Error(`Expected ${expected} token`)
  }

  return payload
}

/**
 * Generation of an access token
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'exp' | 'typ'>): string {
  return jwt.sign({ ...payload, typ: 'access' }, JWT_CONFIG.secret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: Number(JWT_CONFIG.accessExpiresIn),
  })
}

/**
 * Generation of a refresh token
 */
export function generateRefreshToken(payload: Omit<JwtPayload, 'exp' | 'typ'>): string {
  // jwtid: two rotations of one session within the same second used to produce the same token.
  return jwt.sign({ ...payload, typ: 'refresh' }, JWT_CONFIG.secret, {
    algorithm: JWT_ALGORITHM,
    expiresIn: Number(JWT_CONFIG.refreshExpiresIn),
    jwtid: randomUUID(),
  })
}

/**
 * Verification of an access token
 */
export function verifyAccessToken(token: string): JwtPayload {
  try {
    return assertTokenType(jwt.verify(token, JWT_CONFIG.secret, { algorithms: [JWT_ALGORITHM] }) as JwtPayload, 'access')
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message)
    }

    throw new Error('Invalid or expired access token')
  }
}

/**
 * Verification of a refresh token
 */
export function verifyRefreshToken(token: string): JwtPayload {
  try {
    return assertTokenType(jwt.verify(token, JWT_CONFIG.secret, { algorithms: [JWT_ALGORITHM] }) as JwtPayload, 'refresh')
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw new Error(error.message)
    }

    throw new Error('Invalid or expired refresh token')
  }
}

/**
 * Decoding a token without verification (for debugging)
 */
export function decodeToken(token: string): JwtPayload | null {
  return jwt.decode(token) as JwtPayload | null
}

/**
 * Getting the token expiration time in seconds
 */
export function getTokenExpiration(expiresIn: number): number {
  return expiresIn
}
