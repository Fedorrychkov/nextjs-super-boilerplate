import { isDevelop, REGISTRATION_CONFIG } from '@config/env'
import { cacheClient } from '@lib/cache'
import crypto from 'crypto'

import type { TFunction } from '~/lib/i18n'

import { isPasswordRecoveryEmailAvailable } from '../account-recovery.service'
import { emailService } from '../email/email.service'
import { resolvePasswordEmailTemplateName } from '../email/email-locale'
import {
  PENDING_PASSWORD_TTL_SEC,
  REDIS_PREFIX,
  SEND_CODE_MAX_PER_EMAIL_PER_HOUR,
  SEND_WINDOW_SEC,
  VERIFY_LOCKOUT_SEC,
  VERIFY_WRONG_ATTEMPTS_MAX,
} from './password-recovery.constants'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function sendCountKey(email: string): string {
  return `${REDIS_PREFIX}send_count:${normalizeEmail(email)}`
}

function verifyFailKey(email: string): string {
  return `${REDIS_PREFIX}verify_fail:${normalizeEmail(email)}`
}

function verifyLockKey(email: string): string {
  return `${REDIS_PREFIX}verify_lock:${normalizeEmail(email)}`
}

function hashCode(email: string, code: string): string {
  const pepper = REGISTRATION_CONFIG.codePepper

  return crypto
    .createHmac('sha256', pepper)
    .update(`${normalizeEmail(email)}:password:${code}`)
    .digest('hex')
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

function generateSixDigitCode(): string {
  const n = crypto.randomInt(0, 1_000_000)

  return n.toString().padStart(6, '0')
}

async function getTtlSeconds(key: string): Promise<number> {
  const ttl = await cacheClient.ttl(key)

  return ttl != null && ttl > 0 ? ttl : 0
}

export async function assertNotPasswordVerifyLocked(emailRaw: string, t: TFunction): Promise<void> {
  const email = normalizeEmail(emailRaw)
  const locked = await cacheClient.get(verifyLockKey(email))

  if (locked != null && locked !== '') {
    const retryAfterSec = await getTtlSeconds(verifyLockKey(email))
    const { ValidationError } = await import('@lib/error/custom-errors')

    throw new ValidationError(t('auth.password.errors.verifyLocked'), {
      code: 'PASSWORD_VERIFY_LOCKED',
      retryAfterSec,
    })
  }
}

export async function assertCanSendPasswordCode(emailRaw: string, t: TFunction): Promise<void> {
  const email = normalizeEmail(emailRaw)

  await assertNotPasswordVerifyLocked(email, t)

  const countKey = sendCountKey(email)
  const raw = await cacheClient.get(countKey)
  const count = raw ? Number.parseInt(raw, 10) : 0

  if (count >= SEND_CODE_MAX_PER_EMAIL_PER_HOUR) {
    const retryAfterSec = await getTtlSeconds(countKey)
    const { ValidationError } = await import('@lib/error/custom-errors')

    throw new ValidationError(t('auth.password.errors.sendLimitReached'), {
      code: 'PASSWORD_SEND_LIMIT',
      retryAfterSec: retryAfterSec || SEND_WINDOW_SEC,
    })
  }
}

export async function sendPasswordRecoveryCode(
  params: { email: string; purpose: 'change' | 'forgot'; locale?: string | null },
  t: TFunction,
): Promise<{ codeHash: string; devCode?: string }> {
  if (!isPasswordRecoveryEmailAvailable()) {
    const { ValidationError } = await import('@lib/error/custom-errors')

    throw new ValidationError(t('auth.recovery.errors.emailNotAvailable'), { code: 'PASSWORD_EMAIL_UNAVAILABLE' })
  }

  const email = normalizeEmail(params.email)

  await assertCanSendPasswordCode(email, t)

  const code = generateSixDigitCode()
  const codeHash = hashCode(email, code)

  const subject = params.purpose === 'change' ? t('auth.password.email.changeSubject') : t('auth.password.email.forgotSubject')
  const text = t('auth.password.email.codeText', { code })
  const templateName = resolvePasswordEmailTemplateName(params.purpose, params.locale)?.trim()

  try {
    await emailService.sendTransactional({
      to: email,
      subject,
      text,
      ...(templateName
        ? {
            template: {
              name: templateName,
              mergeFields: { code },
            },
          }
        : {}),
    })
  } catch {
    const { ValidationError } = await import('@lib/error/custom-errors')

    throw new ValidationError(t('auth.password.errors.emailFailed'), { code: 'PASSWORD_EMAIL_FAILED' })
  }

  await cacheClient.incr(sendCountKey(email), SEND_WINDOW_SEC)

  return { codeHash, devCode: isDevelop ? code : undefined }
}

export async function verifyPasswordRecoveryCode(params: { email: string; code: string; expectedHash: string }, t: TFunction): Promise<void> {
  const email = normalizeEmail(params.email)
  const code = params.code.replace(/\s/g, '')

  if (!/^\d{6}$/.test(code)) {
    const { ValidationError } = await import('@lib/error/custom-errors')

    throw new ValidationError(t('auth.password.errors.invalidCodeFormat'), { code: 'PASSWORD_CODE_FORMAT' })
  }

  await assertNotPasswordVerifyLocked(email, t)

  const actualHash = hashCode(email, code)
  const valid = safeEqualHex(params.expectedHash, actualHash)

  if (valid) {
    await cacheClient.del(verifyFailKey(email))

    return
  }

  const failKey = verifyFailKey(email)
  const fails = await cacheClient.incr(failKey, PENDING_PASSWORD_TTL_SEC)

  if (fails >= VERIFY_WRONG_ATTEMPTS_MAX) {
    await cacheClient.set(verifyLockKey(email), '1', VERIFY_LOCKOUT_SEC)
    await cacheClient.del(failKey)
    const { ValidationError } = await import('@lib/error/custom-errors')

    throw new ValidationError(t('auth.password.errors.tooManyAttempts'), {
      code: 'PASSWORD_VERIFY_LOCKED',
      retryAfterSec: VERIFY_LOCKOUT_SEC,
    })
  }

  const { ValidationError } = await import('@lib/error/custom-errors')

  throw new ValidationError(t('auth.errors.invalidCode'), {
    code: 'PASSWORD_CODE_INVALID',
    attemptsRemaining: VERIFY_WRONG_ATTEMPTS_MAX - fails,
  })
}

export function pendingKey(pendingId: string): string {
  return `${REDIS_PREFIX}pending:${pendingId}`
}

export function createPendingId(): string {
  return crypto.randomUUID()
}

export async function savePendingSession<T extends object>(pendingId: string, payload: T): Promise<void> {
  await cacheClient.set(pendingKey(pendingId), JSON.stringify(payload), PENDING_PASSWORD_TTL_SEC)
}

export async function loadPendingSession<T extends object>(pendingId: string): Promise<T | null> {
  const raw = await cacheClient.get(pendingKey(pendingId))

  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    await cacheClient.del(pendingKey(pendingId))

    return null
  }
}

export async function deletePendingSession(pendingId: string): Promise<void> {
  await cacheClient.del(pendingKey(pendingId))
}
