'use client'

import { evaluatePasswordPolicy, getPasswordStrengthScore } from '@lib/validation/password-policy'
import { Check, X } from 'lucide-react'
import { useMemo } from 'react'

import type { AppMessageKey } from '~/lib/i18n'
import { useT } from '~/providers'

type Props = {
  password: string
  fieldId: string
}

export const PasswordStrengthPanel = ({ password, fieldId }: Props) => {
  const t = useT()
  const rules = useMemo(() => evaluatePasswordPolicy(password), [password])
  const strengthScore = useMemo(() => getPasswordStrengthScore(password), [password])

  const getStrengthColor = (score: number) => {
    if (score === 0) return 'bg-border'

    if (score <= 1) return 'bg-red-500'

    if (score <= 2) return 'bg-orange-500'

    if (score === 3) return 'bg-amber-500'

    return 'bg-emerald-500'
  }

  const getStrengthText = (score: number) => {
    if (score === 0) return t('password.policy.strength.enter')

    if (score <= 2) return t('password.policy.strength.weak')

    if (score === 3) return t('password.policy.strength.medium')

    return t('password.policy.strength.strong')
  }

  return (
    <>
      <div
        className="mb-4 mt-3 h-1 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={strengthScore}
        aria-valuemin={0}
        aria-valuemax={rules.length}
        aria-label="Password strength"
      >
        <div
          className={`h-full ${getStrengthColor(strengthScore)} transition-all duration-500 ease-out`}
          style={{ width: `${rules.length ? (strengthScore / rules.length) * 100 : 0}%` }}
        />
      </div>

      <p id={`${fieldId}-description`} className="mb-2 text-sm font-medium text-foreground">
        {getStrengthText(strengthScore)}. {t('password.policy.mustContain')}:
      </p>

      <ul className="space-y-1.5" aria-label="Password requirements">
        {rules.map((rule) => (
          <li key={rule.id} className="flex items-center gap-2">
            {rule.met ? (
              <Check size={16} className="text-emerald-500" aria-hidden="true" />
            ) : (
              <X size={16} className="text-muted-foreground/80" aria-hidden="true" />
            )}
            <span className={`text-xs ${rule.met ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {t(rule.messageKey as AppMessageKey, rule.messageParams as Record<string, string | number>)}
              <span className="sr-only">{rule.met ? t('password.policy.requirementMet') : t('password.policy.requirementNotMet')}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  )
}
