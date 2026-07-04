'use client'

import { isPasswordPolicySatisfied } from '@lib/validation/password-policy'
import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, useId, useState } from 'react'

import { Typography } from '~/components/ui'
import { Input } from '~/components/ui/fields/input'
import { Label } from '~/components/ui/fields/label'
import { useT } from '~/providers'
import { cn } from '~/utils/cn'

import { PasswordStrengthPanel } from './PasswordStrengthPanel'

export type PasswordFieldProps = {
  name: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  disabled?: boolean
  required?: boolean
  error?: string
  showStrength?: boolean
  classNames?: {
    label?: string
    input?: string
    root?: string
  }
}

export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(function PasswordField(
  { name, value, onChange, placeholder, label, disabled, required, error, showStrength = true, classNames },
  ref,
) {
  const id = useId()
  const t = useT()
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className={cn('min-w-0 w-full', classNames?.root)}>
      {label && (
        <div className={cn('flex flex-col gap-2 mb-2', classNames?.label)}>
          <Label htmlFor={id}>
            {label}{' '}
            {required && (
              <Typography asTag="span" className="text-destructive">
                *
              </Typography>
            )}
          </Label>
        </div>
      )}

      <div className={cn('relative', classNames?.input)}>
        <Input
          ref={ref}
          id={id}
          name={name}
          className={cn('pe-9', classNames?.input)}
          placeholder={placeholder}
          type={isVisible ? 'text' : 'password'}
          value={value}
          required={required}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={showStrength ? !isPasswordPolicySatisfied(value) && value.length > 0 : undefined}
          aria-describedby={showStrength ? `${id}-description` : undefined}
        />

        <button
          className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
          aria-label={isVisible ? t('password.policy.hidePassword') : t('password.policy.showPassword')}
          aria-pressed={isVisible}
          disabled={disabled}
        >
          {isVisible ? <EyeOff size={16} strokeWidth={2} aria-hidden="true" /> : <Eye size={16} strokeWidth={2} aria-hidden="true" />}
        </button>
      </div>

      {error && (
        <Typography className="mt-2 text-xs text-destructive" role="alert" aria-live="polite">
          {error}
        </Typography>
      )}

      {showStrength && <PasswordStrengthPanel password={value} fieldId={id} />}
    </div>
  )
})
