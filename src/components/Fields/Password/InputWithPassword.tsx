'use client'

import { getFirstPasswordPolicyViolation, isPasswordPolicySatisfied } from '@lib/validation/password-policy'
import get from 'lodash/get'
import { forwardRef } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

import type { AppMessageKey } from '~/lib/i18n'
import { useT } from '~/providers'

import { PasswordField } from './PasswordField'

export type InputWithPasswordProps = {
  name: string
  placeholder?: string
  label?: string
  disabled?: boolean
  classNames?: {
    label?: string
    input?: string
    root?: string
  }
  required?: boolean
}

/**
 * Password field with strength meter for react-hook-form.
 */
export const InputWithPassword = forwardRef<HTMLInputElement, InputWithPasswordProps>(({ name, placeholder, label, required, disabled, classNames }, ref) => {
  const t = useT()
  const {
    watch,
    control,
    formState: { errors },
  } = useFormContext()

  const password = watch(name)
  const error = get(errors, name)?.message as string | undefined

  return (
    <Controller
      name={name}
      control={control}
      rules={{
        validate: (value: string) => {
          if (isPasswordPolicySatisfied(value)) {
            return true
          }

          const violation = getFirstPasswordPolicyViolation(value)

          if (violation) {
            return t(violation.messageKey as AppMessageKey, violation.messageParams as Record<string, string | number>)
          }

          return t('password.policy.invalid')
        },
      }}
      render={({ field }) => (
        <PasswordField
          ref={ref}
          name={name}
          value={field.value ?? password ?? ''}
          onChange={field.onChange}
          placeholder={placeholder}
          label={label}
          required={required}
          disabled={disabled}
          error={error}
          classNames={classNames}
        />
      )}
    />
  )
})

InputWithPassword.displayName = 'InputWithPassword'
