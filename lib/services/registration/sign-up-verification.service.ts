import { isDevelop, REGISTRATION_CONFIG } from '@config/env'
import { cacheClient } from '@lib/cache'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

import type { TFunction } from '~/lib/i18n'
import { time } from '~/utils/time'

import { emailService } from '../email/email.service'
import { resolveVerifyEmailTemplateName } from '../email/email-locale'
import {
  PENDING_SIGNUP_TTL_SEC,
  REDIS_PREFIX,
  SEND_CODE_MAX_PER_EMAIL_PER_HOUR,
  SEND_WINDOW_SEC,
  VERIFY_LOCKOUT_SEC,
  VERIFY_WRONG_ATTEMPTS_MAX,
} from './sign-up-verification.constants'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function pendingKey(email: string): string {
  return `${REDIS_PREFIX}pending:${normalizeEmail(email)}`
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
    .update(`${normalizeEmail(email)}:${code}`)
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

export type PendingSignupPayload = {
  passwordHash: string
  codeHash: string
  createdAt: number
}

async function getTtlSeconds(key: string): Promise<number> {
  const ttl = await cacheClient.ttl(key)

  return ttl != null && ttl > 0 ? ttl : 0
}

export async function assertNotVerifyLocked(emailRaw: string): Promise<void> {
  const email = normalizeEmail(emailRaw)
  const locked = await cacheClient.get(verifyLockKey(email))

  if (locked != null && locked !== '') {
    const retryAfterSec = await getTtlSeconds(verifyLockKey(email))
    const { ValidationError } = await import('@lib/error/custom-errors')

    throw new ValidationError('Too many incorrect codes. Try again later.', {
      code: 'SIGNUP_VERIFY_LOCKED',
      retryAfterSec,
    })
  }
}

export async function assertCanSendCode(emailRaw: string, t: TFunction): Promise<void> {
  const email = normalizeEmail(emailRaw)

  await assertNotVerifyLocked(email)

  const countKey = sendCountKey(email)
  const raw = await cacheClient.get(countKey)
  const count = raw ? Number.parseInt(raw, 10) : 0

  if (count >= SEND_CODE_MAX_PER_EMAIL_PER_HOUR) {
    const retryAfterSec = await getTtlSeconds(countKey)
    const { ValidationError } = await import('@lib/error/custom-errors')

    throw new ValidationError(t('auth.errors.signUpSendLimitReached'), {
      code: 'SIGNUP_SEND_LIMIT',
      retryAfterSec: retryAfterSec || SEND_WINDOW_SEC,
    })
  }
}

export async function requestSignupCode(params: { email: string; password: string; locale?: string }, t: TFunction): Promise<{ devCode?: string }> {
  const email = normalizeEmail(params.email)

  await assertCanSendCode(email, t)

  const code = generateSixDigitCode()
  const codeHash = hashCode(email, code)
  const passwordHash = await bcrypt.hash(params.password, 12)
  const payload: PendingSignupPayload = {
    passwordHash,
    codeHash,
    createdAt: Date.now(),
  }

  await cacheClient.set(pendingKey(email), JSON.stringify(payload), PENDING_SIGNUP_TTL_SEC)
  await cacheClient.incr(sendCountKey(email), SEND_WINDOW_SEC)
  await cacheClient.del(verifyFailKey(email))

  const subject = t('auth.messages.signUpCodeSent')
  const text = t('auth.email.signUp.text', { code })

  try {
    await emailService.sendTransactional({
      to: email,
      subject,
      text,
      template: {
        name: resolveVerifyEmailTemplateName(params.locale),
        mergeFields: { code },
      },
    })
  } catch {
    await cacheClient.del(pendingKey(email))
    const { ValidationError } = await import('@lib/error/custom-errors')

    throw new ValidationError(t('auth.errors.signUpEmailFailed'), {
      code: 'SIGNUP_EMAIL_FAILED',
    })
  }

  const devCode = isDevelop ? code : undefined

  return { devCode }
}

export async function completeSignupWithCode(
  params: { email: string; code: string },
  t: TFunction,
): Promise<{
  email: string
  passwordHash: string
}> {
  const email = normalizeEmail(params.email)
  const code = params.code.replace(/\s/g, '')

  if (!/^\d{6}$/.test(code)) {
    const { ValidationError } = await import('@lib/error/custom-errors')

    throw new ValidationError('Enter the 6-digit code from the email.', { code: 'SIGNUP_CODE_FORMAT' })
  }

  await assertNotVerifyLocked(email)

  const raw = await cacheClient.get(pendingKey(email))

  if (!raw) {
    const { ValidationError } = await import('@lib/error/custom-errors')

    throw new ValidationError(t('auth.errors.noPendingRegistrationForThisEmailRequestNewCode'), {
      code: 'SIGNUP_NO_PENDING',
    })
  }

  let pending: PendingSignupPayload

  try {
    pending = JSON.parse(raw) as PendingSignupPayload
  } catch {
    await cacheClient.del(pendingKey(email))
    const { ValidationError } = await import('@lib/error/custom-errors')

    throw new ValidationError(t('auth.errors.invalidRegistrationStatePleaseStartAgain'), { code: 'SIGNUP_INVALID_STATE' })
  }

  const expectedHash = pending.codeHash
  const actualHash = hashCode(email, code)

  const valid = safeEqualHex(expectedHash, actualHash)

  if (!valid) {
    const failKey = verifyFailKey(email)
    const fails = await cacheClient.incr(failKey, PENDING_SIGNUP_TTL_SEC)

    if (fails >= VERIFY_WRONG_ATTEMPTS_MAX) {
      await cacheClient.set(verifyLockKey(email), '1', VERIFY_LOCKOUT_SEC)
      await cacheClient.del(failKey)
      await cacheClient.del(pendingKey(email))
      const { ValidationError } = await import('@lib/error/custom-errors')

      throw new ValidationError(t('auth.errors.signUpTooManyAttempts', { after: time().add(VERIFY_LOCKOUT_SEC, 'seconds').format('HH:mm:ss') }), {
        code: 'SIGNUP_VERIFY_LOCKED',
        retryAfterSec: VERIFY_LOCKOUT_SEC,
      })
    }

    const { ValidationError } = await import('@lib/error/custom-errors')

    throw new ValidationError(t('auth.errors.invalidCode'), {
      code: 'SIGNUP_CODE_INVALID',
      attemptsRemaining: VERIFY_WRONG_ATTEMPTS_MAX - fails,
    })
  }

  await cacheClient.del(pendingKey(email))
  await cacheClient.del(verifyFailKey(email))
  await clearSignupThrottleKeysAfterSuccess(email)

  return { email, passwordHash: pending.passwordHash }
}

/** After successful verification, drop rate-limit / lock keys so the email can register again later without waiting on hourly counters. */
export async function clearSignupThrottleKeysAfterSuccess(email: string): Promise<void> {
  const n = normalizeEmail(email)

  await Promise.all([cacheClient.del(sendCountKey(n)), cacheClient.del(verifyLockKey(n))])
}
