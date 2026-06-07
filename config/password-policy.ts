/** Shared password policy for all *new* password fields (not login). */

export const PASSWORD_POLICY = {
  minLength: 6,
  maxLength: 128,
} as const

export type PasswordRuleId = 'minLength' | 'digit' | 'lowercase' | 'uppercase'

export type PasswordRuleConfig = {
  id: PasswordRuleId
  /** Human-readable pattern hint (docs / tooling). */
  patternSource: string
  messageKey: 'password.policy.minLength' | 'password.policy.digit' | 'password.policy.lowercase' | 'password.policy.uppercase'
  messageParams?: Record<string, string | number>
}

export const PASSWORD_RULES: PasswordRuleConfig[] = [
  {
    id: 'minLength',
    patternSource: `.{${PASSWORD_POLICY.minLength},}`,
    messageKey: 'password.policy.minLength',
    messageParams: { min: PASSWORD_POLICY.minLength },
  },
  {
    id: 'digit',
    patternSource: '[0-9]',
    messageKey: 'password.policy.digit',
  },
  {
    id: 'lowercase',
    patternSource: '[a-z]',
    messageKey: 'password.policy.lowercase',
  },
  {
    id: 'uppercase',
    patternSource: '[A-Z]',
    messageKey: 'password.policy.uppercase',
  },
]
