import { ACCOUNT_CONFIG, EMAIL_CONFIG } from '@config/env'
import connectDB from '@lib/db/client'
import UserSettings from '@lib/db/models/UserSettings'

export type RecoveryFactor = 'email' | 'totp'
export type RecoveryStrictness = 'strict' | 'flexible'

/** Email factor for password change / forgot (console OK in dev; empty = off). */
export function isPasswordRecoveryEmailAvailable(): boolean {
  const { sendMode, emailApiKey } = EMAIL_CONFIG

  if (sendMode === 'empty') {
    return false
  }

  if (sendMode === 'elastic') {
    return Boolean(emailApiKey?.trim())
  }

  return true
}

export async function isUserMfaEnabled(userId: string): Promise<boolean> {
  await connectDB()

  const settings = await UserSettings.findOne({ userId }).select('mfaEnabled').lean()

  return Boolean(settings?.mfaEnabled)
}

export type RecoveryFactorPlan = {
  platformEmailAvailable: boolean
  userMfaEnabled: boolean
  strictness: RecoveryStrictness
  allowedFactors: RecoveryFactor[]
  requiredFactors: RecoveryFactor[]
  selfServicePossible: boolean
  lostAccessOptions: Array<RecoveryFactor | 'support'>
}

export function resolveRecoveryFactorPlan(params: {
  platformEmailAvailable: boolean
  userMfaEnabled: boolean
  strictness?: RecoveryStrictness
}): RecoveryFactorPlan {
  const strictness: RecoveryStrictness = params.strictness ?? (ACCOUNT_CONFIG.recoveryStrictness as RecoveryStrictness)
  const allowedFactors: RecoveryFactor[] = []

  if (params.platformEmailAvailable) {
    allowedFactors.push('email')
  }

  if (params.userMfaEnabled) {
    allowedFactors.push('totp')
  }

  const selfServicePossible = allowedFactors.length > 0

  let requiredFactors: RecoveryFactor[] = []

  if (selfServicePossible) {
    if (strictness === 'strict') {
      requiredFactors = [...allowedFactors]
    } else {
      requiredFactors = allowedFactors.length === 1 ? [...allowedFactors] : []
    }
  }

  const lostAccessOptions: Array<RecoveryFactor | 'support'> = [...allowedFactors, 'support']

  return {
    platformEmailAvailable: params.platformEmailAvailable,
    userMfaEnabled: params.userMfaEnabled,
    strictness,
    allowedFactors,
    requiredFactors,
    selfServicePossible,
    lostAccessOptions,
  }
}

export function areRecoveryFactorsSatisfied(params: {
  plan: RecoveryFactorPlan
  emailVerified: boolean
  mfaVerified: boolean
  /** flexible: user chose single factor path */
  flexibleFactor?: RecoveryFactor
}): boolean {
  const { plan, emailVerified, mfaVerified, flexibleFactor } = params

  if (!plan.selfServicePossible) {
    return false
  }

  if (plan.strictness === 'strict') {
    if (plan.allowedFactors.includes('email') && !emailVerified) {
      return false
    }

    if (plan.allowedFactors.includes('totp') && !mfaVerified) {
      return false
    }

    return true
  }

  if (flexibleFactor === 'email') {
    return emailVerified
  }

  if (flexibleFactor === 'totp') {
    return mfaVerified
  }

  return emailVerified || mfaVerified
}

export function getPublicRecoveryCapabilities() {
  return {
    platformEmailAvailable: isPasswordRecoveryEmailAvailable(),
    strictness: ACCOUNT_CONFIG.recoveryStrictness,
    passwordChangeEnabled: ACCOUNT_CONFIG.passwordChangeEnabled,
    passwordForgotEnabled: ACCOUNT_CONFIG.passwordForgotEnabled,
    sessionsEnabled: ACCOUNT_CONFIG.sessionsEnabled,
    adminAccountRecoveryEnabled: ACCOUNT_CONFIG.adminAccountRecoveryEnabled,
  }
}

export async function getUserRecoveryCapabilities(userId: string) {
  const platformEmailAvailable = isPasswordRecoveryEmailAvailable()
  const userMfaEnabled = await isUserMfaEnabled(userId)
  const plan = resolveRecoveryFactorPlan({ platformEmailAvailable, userMfaEnabled })

  return {
    ...getPublicRecoveryCapabilities(),
    userMfaEnabled,
    allowedFactors: plan.allowedFactors,
    requiredFactors: plan.requiredFactors,
    selfServicePossible: plan.selfServicePossible,
    lostAccessOptions: plan.lostAccessOptions,
  }
}
