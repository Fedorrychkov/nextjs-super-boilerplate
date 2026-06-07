import { ACCOUNT_CONFIG } from '@config/env'
import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import UserSettings from '@lib/db/models/UserSettings'
import { ValidationError } from '@lib/error/custom-errors'
import { decryptSecret, verifyTotpCode } from '@lib/security/totp'
import type { RecoveryFactor } from '@lib/services/account-recovery.service'
import {
  areRecoveryFactorsSatisfied,
  isPasswordRecoveryEmailAvailable,
  isUserMfaEnabled,
  resolveRecoveryFactorPlan,
} from '@lib/services/account-recovery.service'
import { authService } from '@lib/services/auth.service'
import { recordSecurityAuditEvent } from '@lib/services/security-audit.service'
import { notifyPasswordReset } from '@lib/services/security-notification.service'
import { assertPasswordPolicy } from '@lib/validation/password-policy'

import type { TFunction } from '~/lib/i18n'

import {
  createPendingId,
  deletePendingSession,
  loadPendingSession,
  savePendingSession,
  sendPasswordRecoveryCode,
  verifyPasswordRecoveryCode,
} from './password-recovery-code.service'

type PendingPasswordForgot = {
  kind: 'forgot'
  userId: string
  email: string
  emailCodeHash: string | null
  emailVerified: boolean
  mfaVerified: boolean
  allowedFactors: RecoveryFactor[]
  requiredFactors: RecoveryFactor[]
  strictness: 'strict' | 'flexible'
  createdAt: number
}

const GENERIC_FORGOT_MESSAGE = 'auth.password.messages.forgotStarted'

export async function startPasswordForgot(params: { email: string; locale?: string | null }, t: TFunction) {
  if (!ACCOUNT_CONFIG.passwordForgotEnabled) {
    throw new ValidationError(t('auth.password.errors.featureDisabled'), { code: 'PASSWORD_FORGOT_DISABLED' })
  }

  const email = params.email.trim().toLowerCase()

  await connectDB()
  const user = await User.findOne({ email }).select('_id email')

  if (!user) {
    return {
      message: t(GENERIC_FORGOT_MESSAGE),
      recoveryPossible: false as const,
      supportRequired: false as const,
    }
  }

  const userId = user._id.toString()
  const platformEmailAvailable = isPasswordRecoveryEmailAvailable()
  const userMfaEnabled = await isUserMfaEnabled(userId)
  const plan = resolveRecoveryFactorPlan({ platformEmailAvailable, userMfaEnabled })

  if (!plan.selfServicePossible) {
    return {
      message: t(GENERIC_FORGOT_MESSAGE),
      recoveryPossible: false as const,
      supportRequired: true as const,
    }
  }

  let emailCodeHash: string | null = null
  let devCode: string | undefined

  if (plan.allowedFactors.includes('email')) {
    const sent = await sendPasswordRecoveryCode({ email: user.email, purpose: 'forgot', locale: params.locale }, t)
    emailCodeHash = sent.codeHash
    devCode = sent.devCode
  }

  const pendingId = createPendingId()
  const pending: PendingPasswordForgot = {
    kind: 'forgot',
    userId,
    email: user.email,
    emailCodeHash,
    emailVerified: !plan.allowedFactors.includes('email'),
    mfaVerified: !plan.allowedFactors.includes('totp'),
    allowedFactors: plan.allowedFactors,
    requiredFactors: plan.requiredFactors,
    strictness: plan.strictness,
    createdAt: Date.now(),
  }

  await savePendingSession(pendingId, pending)

  return {
    message: t(GENERIC_FORGOT_MESSAGE),
    recoveryPossible: true as const,
    pendingId,
    allowedFactors: plan.allowedFactors,
    requiredFactors: plan.requiredFactors,
    strictness: plan.strictness,
    emailSent: plan.allowedFactors.includes('email'),
    needsTotp: plan.allowedFactors.includes('totp'),
    devCode,
  }
}

export async function verifyForgotEmailCode(params: { pendingId: string; emailCode: string }, t: TFunction) {
  const pending = await loadPendingSession<PendingPasswordForgot>(params.pendingId)

  if (!pending || pending.kind !== 'forgot') {
    throw new ValidationError(t('auth.password.errors.pendingExpired'), { code: 'PASSWORD_PENDING_EXPIRED' })
  }

  if (!pending.emailCodeHash) {
    throw new ValidationError(t('auth.password.errors.emailCodeNotRequired'))
  }

  await verifyPasswordRecoveryCode({ email: pending.email, code: params.emailCode, expectedHash: pending.emailCodeHash }, t)

  pending.emailVerified = true
  await savePendingSession(params.pendingId, pending)

  return { success: true as const, needsTotp: pending.allowedFactors.includes('totp') && !pending.mfaVerified }
}

export async function verifyForgotTotp(params: { pendingId: string; totp: string }, t: TFunction) {
  const pending = await loadPendingSession<PendingPasswordForgot>(params.pendingId)

  if (!pending || pending.kind !== 'forgot') {
    throw new ValidationError(t('auth.password.errors.pendingExpired'), { code: 'PASSWORD_PENDING_EXPIRED' })
  }

  await connectDB()
  const settings = await UserSettings.findOne({ userId: pending.userId })

  if (!settings?.mfaEnabled || !settings.mfaSecret) {
    throw new ValidationError(t('totp.errors.mfaNotEnabledForThisUser'))
  }

  const secret = decryptSecret(settings.mfaSecret)
  const totpValid = await verifyTotpCode(secret, params.totp, t)

  if (!totpValid.valid) {
    throw new ValidationError(t('totp.errors.invalidMfaCode'))
  }

  pending.mfaVerified = true
  await savePendingSession(params.pendingId, pending)

  return { success: true as const }
}

export async function completePasswordForgot(
  params: {
    pendingId: string
    newPassword: string
    emailCode?: string
    totp?: string
    flexibleFactor?: RecoveryFactor
  },
  t: TFunction,
) {
  const pending = await loadPendingSession<PendingPasswordForgot>(params.pendingId)

  if (!pending || pending.kind !== 'forgot') {
    throw new ValidationError(t('auth.password.errors.pendingExpired'), { code: 'PASSWORD_PENDING_EXPIRED' })
  }

  assertPasswordPolicy(params.newPassword, t)

  const plan = resolveRecoveryFactorPlan({
    platformEmailAvailable: pending.allowedFactors.includes('email'),
    userMfaEnabled: pending.allowedFactors.includes('totp'),
    strictness: pending.strictness,
  })

  let emailVerified = pending.emailVerified
  let mfaVerified = pending.mfaVerified

  if (params.emailCode && pending.emailCodeHash) {
    await verifyPasswordRecoveryCode({ email: pending.email, code: params.emailCode, expectedHash: pending.emailCodeHash }, t)
    emailVerified = true
  }

  if (params.totp) {
    await verifyForgotTotp({ pendingId: params.pendingId, totp: params.totp }, t)
    mfaVerified = true
  }

  if (
    !areRecoveryFactorsSatisfied({
      plan,
      emailVerified,
      mfaVerified,
      flexibleFactor: params.flexibleFactor,
    })
  ) {
    throw new ValidationError(t('auth.password.errors.factorsIncomplete'), { code: 'PASSWORD_FACTORS_INCOMPLETE' })
  }

  await connectDB()
  const user = await User.findById(pending.userId).select('+password')

  if (!user) {
    throw new ValidationError(t('user.errors.notFound'))
  }

  user.password = params.newPassword
  await user.save()

  await authService.logoutAll(pending.userId)
  await deletePendingSession(params.pendingId)

  void recordSecurityAuditEvent({
    action: 'password_reset',
    actorUserId: pending.userId,
    targetUserId: pending.userId,
  })

  void notifyPasswordReset({ recipientUserId: pending.userId, t })

  return { success: true as const }
}
