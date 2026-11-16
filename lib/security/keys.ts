import crypto from 'node:crypto'

import { MFA_CONFIG } from '@config/env'

/**
 * Purpose-bound keys derived from the one encryption key the deployment already has
 * (`MFA_ENCRYPTION_KEY`, no new env variable). Each purpose gets its own key (HKDF-SHA256): a
 * ciphertext of one purpose is useless for another, and one leaked subkey does not reveal the rest.
 *
 * The TOTP secret is NOT moved here: it has been encrypted with `sha256(key)` from day one
 * (`totp.ts`), and switching its scheme would make every enabled MFA undecryptable.
 */
export type KeyPurpose = 'platform-settings'

export function derivedKey(purpose: KeyPurpose, master: string = MFA_CONFIG.encryptionKey): Buffer {
  if (!master) throw new Error('MFA_ENCRYPTION_KEY is not set — secrets cannot be encrypted')

  return Buffer.from(crypto.hkdfSync('sha256', master, 'nsb', `nsb:${purpose}`, 32))
}

/** AES-256-GCM, `iv.tag.ciphertext` in base64url. A forged value or a wrong key throws, never returns garbage. */
export function encryptSecret(plaintext: string, purpose: KeyPurpose, master?: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey(purpose, master), iv)
  const data = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])

  return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64url')).join('.')
}

export function decryptSecret(sealed: string, purpose: KeyPurpose, master?: string): string {
  const [iv, tag, data] = sealed.split('.').map((part) => Buffer.from(part, 'base64url'))

  if (!iv || !tag || !data) throw new Error('Sealed value is damaged')

  const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey(purpose, master), iv)

  decipher.setAuthTag(tag)

  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}
