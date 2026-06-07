import { ACCOUNT_CONFIG } from '@config/env'
import connectDB from '@lib/db/client'
import User from '@lib/db/models/User'
import UserSettings from '@lib/db/models/UserSettings'
import { ValidationError } from '@lib/error/custom-errors'
import { authService } from '@lib/services/auth.service'
import { recordSecurityAuditEvent } from '@lib/services/security-audit.service'
import { notifyAdminPasswordSet, notifyMfaDisabled } from '@lib/services/security-notification.service'
import { assertPasswordPolicy } from '@lib/validation/password-policy'

import type { TFunction } from '~/lib/i18n'

export async function adminResetUserMfa(params: { targetUserId: string; adminUserId: string }, t: TFunction) {
  if (!ACCOUNT_CONFIG.adminAccountRecoveryEnabled) {
    throw new ValidationError(t('auth.password.errors.featureDisabled'), { code: 'ADMIN_RECOVERY_DISABLED' })
  }

  if (params.targetUserId === params.adminUserId) {
    throw new ValidationError(t('user.errors.selfUpdateNotAllowed'))
  }

  await connectDB()

  const settings = await UserSettings.findOne({ userId: params.targetUserId })

  if (!settings?.mfaEnabled) {
    throw new ValidationError(t('totp.errors.mfaNotEnabledForThisUser'))
  }

  settings.mfaEnabled = false
  settings.mfaSecret = null
  settings.mfaBackupCodes = []
  await settings.save()

  void notifyMfaDisabled({
    recipientUserId: params.targetUserId,
    t,
  })

  void recordSecurityAuditEvent({
    action: 'admin_mfa_reset',
    actorUserId: params.adminUserId,
    targetUserId: params.targetUserId,
  })

  return { success: true as const }
}

export async function adminSetUserPassword(params: { targetUserId: string; adminUserId: string; newPassword: string }, t: TFunction) {
  if (!ACCOUNT_CONFIG.adminAccountRecoveryEnabled) {
    throw new ValidationError(t('auth.password.errors.featureDisabled'), { code: 'ADMIN_RECOVERY_DISABLED' })
  }

  if (params.targetUserId === params.adminUserId) {
    throw new ValidationError(t('user.errors.selfUpdateNotAllowed'))
  }

  assertPasswordPolicy(params.newPassword, t)

  await connectDB()

  const user = await User.findById(params.targetUserId).select('+password')

  if (!user) {
    throw new ValidationError(t('user.errors.notFound'))
  }

  user.password = params.newPassword
  await user.save()

  await authService.logoutAll(params.targetUserId)

  void recordSecurityAuditEvent({
    action: 'admin_password_set',
    actorUserId: params.adminUserId,
    targetUserId: params.targetUserId,
  })

  void notifyAdminPasswordSet({ recipientUserId: params.targetUserId, t })

  return { success: true as const }
}
