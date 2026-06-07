import { PASSWORD_POLICY, PASSWORD_RULES, type PasswordRuleConfig, type PasswordRuleId } from '@config/password-policy'
import { ValidationError } from '@lib/error/custom-errors'

import type { TFunction } from '~/lib/i18n'

export type PasswordRuleEvaluation = {
  id: PasswordRuleId
  met: boolean
  messageKey: PasswordRuleConfig['messageKey']
  messageParams?: PasswordRuleConfig['messageParams']
}

function rulePattern(rule: PasswordRuleConfig): RegExp {
  if (rule.id === 'minLength') {
    return new RegExp(`.{${PASSWORD_POLICY.minLength},}`)
  }

  return new RegExp(rule.patternSource)
}

export function evaluatePasswordPolicy(password: string): PasswordRuleEvaluation[] {
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    met: rulePattern(rule).test(password),
    messageKey: rule.messageKey,
    messageParams: rule.messageParams,
  }))
}

export function getPasswordStrengthScore(password: string): number {
  return evaluatePasswordPolicy(password).filter((rule) => rule.met).length
}

export function isPasswordPolicySatisfied(password: string): boolean {
  if (!password || password.length > PASSWORD_POLICY.maxLength) {
    return false
  }

  return evaluatePasswordPolicy(password).every((rule) => rule.met)
}

export function getFirstPasswordPolicyViolation(password: string): PasswordRuleEvaluation | null {
  if (!password) {
    return evaluatePasswordPolicy('')[0] ?? null
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    return null
  }

  return evaluatePasswordPolicy(password).find((rule) => !rule.met) ?? null
}

/** Server-side validation for any new-password flow (not login). */
export function assertPasswordPolicy(password: string, t: TFunction): void {
  if (!password) {
    throw new ValidationError(t('password.policy.invalid'))
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    throw new ValidationError(t('password.policy.tooLong', { max: PASSWORD_POLICY.maxLength }))
  }

  const violation = getFirstPasswordPolicyViolation(password)

  if (violation) {
    throw new ValidationError(t(violation.messageKey, violation.messageParams as Record<string, string | number>))
  }
}

export function getPasswordPolicyErrorMessage(password: string, t: TFunction): string | null {
  if (isPasswordPolicySatisfied(password)) {
    return null
  }

  if (password.length > PASSWORD_POLICY.maxLength) {
    return t('password.policy.tooLong', { max: PASSWORD_POLICY.maxLength })
  }

  const violation = getFirstPasswordPolicyViolation(password)

  if (violation) {
    return t(violation.messageKey, violation.messageParams as Record<string, string | number>)
  }

  return t('password.policy.invalid')
}

export { PASSWORD_POLICY, PASSWORD_RULES }
