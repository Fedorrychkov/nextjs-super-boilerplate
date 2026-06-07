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
import { notifyPasswordChanged } from '@lib/services/security-notification.service'
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

type PendingPasswordChange = {
  kind: 'change'
  userId: string
  email: string
  newPassword: string
  emailCodeHash: string | null
  emailVerified: boolean
  mfaVerified: boolean
  allowedFactors: RecoveryFactor[]
  requiredFactors: RecoveryFactor[]
  strictness: 'strict' | 'flexible'
  createdAt: number
}

export async function requestPasswordChange(params: { userId: string; currentPassword: string; newPassword: string }, t: TFunction) {
  if (!ACCOUNT_CONFIG.passwordChangeEnabled) {
    throw new ValidationError(t('auth.password.errors.featureDisabled'), { code: 'PASSWORD_CHANGE_DISABLED' })
  }

  await connectDB()

  const user = await User.findById(params.userId).select('+password')

  if (!user) {
    throw new ValidationError(t('user.errors.notFound'))
  }

  const passwordValid = await user.comparePassword(params.currentPassword)

  if (!passwordValid) {
    throw new ValidationError(t('auth.errors.invalidPassword'))
  }

  assertPasswordPolicy(params.newPassword, t)

  if (params.currentPassword === params.newPassword) {
    throw new ValidationError(t('auth.password.errors.samePassword'))
  }

  const platformEmailAvailable = isPasswordRecoveryEmailAvailable()
  const userMfaEnabled = await isUserMfaEnabled(params.userId)
  const plan = resolveRecoveryFactorPlan({ platformEmailAvailable, userMfaEnabled })

  if (!plan.selfServicePossible) {
    throw new ValidationError(t('auth.recovery.errors.supportRequired'), { code: 'PASSWORD_RECOVERY_SUPPORT' })
  }

  let emailCodeHash: string | null = null
  let devCode: string | undefined

  if (plan.allowedFactors.includes('email')) {
    const sent = await sendPasswordRecoveryCode({ email: user.email, purpose: 'change', locale: user.languageCode }, t)
    emailCodeHash = sent.codeHash
    devCode = sent.devCode
  }

  const pendingId = createPendingId()
  const pending: PendingPasswordChange = {
    kind: 'change',
    userId: params.userId,
    email: user.email,
    newPassword: params.newPassword,
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
    pendingId,
    allowedFactors: plan.allowedFactors,
    requiredFactors: plan.requiredFactors,
    strictness: plan.strictness,
    emailSent: plan.allowedFactors.includes('email'),
    needsTotp: plan.allowedFactors.includes('totp'),
    devCode,
  }
}

export async function confirmPasswordChange(
  params: {
    userId: string
    pendingId: string
    emailCode?: string
    totp?: string
    flexibleFactor?: RecoveryFactor
  },
  t: TFunction,
) {
  if (!ACCOUNT_CONFIG.passwordChangeEnabled) {
    throw new ValidationError(t('auth.password.errors.featureDisabled'), { code: 'PASSWORD_CHANGE_DISABLED' })
  }

  const pending = await loadPendingSession<PendingPasswordChange>(params.pendingId)

  if (!pending || pending.kind !== 'change' || pending.userId !== params.userId) {
    throw new ValidationError(t('auth.password.errors.pendingExpired'), { code: 'PASSWORD_PENDING_EXPIRED' })
  }

  const plan = resolveRecoveryFactorPlan({
    platformEmailAvailable: pending.allowedFactors.includes('email'),
    userMfaEnabled: pending.allowedFactors.includes('totp'),
    strictness: pending.strictness,
  })

  let emailVerified = pending.emailVerified
  let mfaVerified = pending.mfaVerified

  if (plan.allowedFactors.includes('email') && params.emailCode && pending.emailCodeHash) {
    await verifyPasswordRecoveryCode({ email: pending.email, code: params.emailCode, expectedHash: pending.emailCodeHash }, t)
    emailVerified = true
  }

  if (plan.allowedFactors.includes('totp') && params.totp) {
    await connectDB()
    const settings = await UserSettings.findOne({ userId: params.userId })

    if (!settings?.mfaEnabled || !settings.mfaSecret) {
      throw new ValidationError(t('totp.errors.mfaNotEnabledForThisUser'))
    }

    const secret = decryptSecret(settings.mfaSecret)
    const totpValid = await verifyTotpCode(secret, params.totp, t)

    if (!totpValid.valid) {
      throw new ValidationError(t('totp.errors.invalidMfaCode'))
    }

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
  const user = await User.findById(params.userId).select('+password')

  if (!user) {
    throw new ValidationError(t('user.errors.notFound'))
  }

  user.password = pending.newPassword
  await user.save()

  await authService.logoutAll(params.userId)
  await deletePendingSession(params.pendingId)

  void recordSecurityAuditEvent({
    action: 'password_changed',
    actorUserId: params.userId,
    targetUserId: params.userId,
  })

  void notifyPasswordChanged({ recipientUserId: params.userId, t })

  return { success: true as const }
}
