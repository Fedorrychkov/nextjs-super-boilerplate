import { MFA_CONFIG, NEXT_PUBLIC_SITE_URL } from '@config/env'
import { ValidationError } from '@lib/error/custom-errors'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { generateSecret, generateURI, verify } from 'otplib'

import { Logger } from '~/utils/logger'

const TOTP_ISSUER = NEXT_PUBLIC_SITE_URL.replace(/^https?:\/\//, '') || 'nextjs-super-boilerplate'

const getEncryptionKey = () => {
  if (!MFA_CONFIG.encryptionKey) {
    throw new ValidationError('MFA encryption key is not configured')
  }

  return crypto.createHash('sha256').update(MFA_CONFIG.encryptionKey).digest()
}

export const generateTotpSecret = () => {
  return generateSecret()
}

export const getOtpauthUrl = (secret: string, email: string) => {
  return generateURI({
    issuer: TOTP_ISSUER,
    label: email,
    secret,
  })
}

export const verifyTotpCode = (secret: string, code: string) => {
  const logger = new Logger(['verifyTotpCode', '[lib/security/totp.ts]'])

  return verify({ token: code, secret }).catch((error: Error) => {
    logger.error('Invalid code', code, error?.message)

    throw new ValidationError('Invalid code')
  })
}

export const encryptSecret = (secret: string): string => {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export const decryptSecret = (encrypted: string): string => {
  const key = getEncryptionKey()
  const buffer = Buffer.from(encrypted, 'base64')

  const iv = buffer.subarray(0, 12)
  const authTag = buffer.subarray(12, 28)
  const ciphertext = buffer.subarray(28)

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()])

  return decrypted.toString('utf8')
}

export const generateBackupCodes = (count = 10): string[] => {
  const codes: string[] = []

  for (let i = 0; i < count; i += 1) {
    const part1 = crypto.randomBytes(4).toString('hex')
    const part2 = crypto.randomBytes(4).toString('hex')
    codes.push(`${part1}-${part2}`)
  }

  return codes
}

export const hashBackupCodes = async (codes: string[]): Promise<string[]> => {
  const saltRounds = 10

  return Promise.all(
    codes.map(async (code) => {
      return bcrypt.hash(code, saltRounds)
    }),
  )
}

export const consumeBackupCode = async (code: string, hashedCodes: string[]): Promise<{ matched: boolean; remainingCodes: string[] }> => {
  for (let i = 0; i < hashedCodes.length; i += 1) {
    const hashed = hashedCodes[i]
    const isMatch = await bcrypt.compare(code, hashed)

    if (isMatch) {
      const remaining = [...hashedCodes.slice(0, i), ...hashedCodes.slice(i + 1)]

      return { matched: true, remainingCodes: remaining }
    }
  }

  return { matched: false, remainingCodes: hashedCodes }
}
