'use client'

import { get } from 'lodash'
import { Check, Eye, EyeOff, X } from 'lucide-react'
import { forwardRef, useId, useMemo, useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

import { Input } from '~/components/ui/fields/input'
import { Label } from '~/components/ui/fields/label'
import { cn } from '~/utils/cn'

export type InputWithPasswordProps = {
  name: string
  placeholder?: string
  label?: string
  classNames?: {
    label?: string
    input?: string
    root?: string
  }
  required?: boolean
}

/**
 * Important:
 * Use only with react-hook-form
 */
export const InputWithPassword = forwardRef<HTMLInputElement, InputWithPasswordProps>(({ name, placeholder, label, required, classNames }, ref) => {
  const id = useId()
  const {
    watch,
    formState: { errors },
  } = useFormContext()

  const password = watch(name)

  const error = get(errors, name)?.message

  const [isVisible, setIsVisible] = useState<boolean>(false)

  const toggleVisibility = () => setIsVisible((prevState) => !prevState)

  const checkStrength = (pass: string) => {
    const requirements = [
      { regex: /.{6,}/, text: 'Minimum 6 characters' },
      { regex: /[0-9]/, text: 'Minimum 1 digit' },
      { regex: /[a-z]/, text: 'Minimum 1 lowercase letter' },
      { regex: /[A-Z]/, text: 'Minimum 1 uppercase letter' },
    ]

    return requirements.map((req) => ({
      met: req.regex.test(pass),
      text: req.text,
    }))
  }

  const strength = checkStrength(password)

  const strengthScore = useMemo(() => {
    return strength.filter((req) => req.met).length
  }, [strength])

  const getStrengthColor = (score: number) => {
    if (score === 0) return 'bg-border'

    if (score <= 1) return 'bg-red-500'

    if (score <= 2) return 'bg-orange-500'

    if (score === 3) return 'bg-amber-500'

    return 'bg-emerald-500'
  }

  const getStrengthText = (score: number) => {
    if (score === 0) return 'Enter password'

    if (score <= 2) return 'Weak password'

    if (score === 3) return 'Medium strength'

    return 'Strong password'
  }

  return (
    <div className={cn('min-w-[300px]', classNames?.root)}>
      <div className={cn('flex flex-col gap-2', classNames?.label)}>
        <Label htmlFor={id}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        <div className={cn('relative', classNames?.input)}>
          <Controller
            name={name}
            render={({ field: { onChange: defaultOnChange } }) => (
              <>
                <Input
                  ref={ref}
                  id={id}
                  name={name}
                  className={cn('pe-9', classNames?.input)}
                  placeholder={placeholder}
                  type={isVisible ? 'text' : 'password'}
                  value={password}
                  required={required}
                  onChange={(e) => {
                    defaultOnChange(e)
                  }}
                  aria-invalid={strengthScore < 4}
                  aria-describedby={`${id}-description`}
                />
              </>
            )}
          />

          <button
            className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
            type="button"
            onClick={toggleVisibility}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
            aria-pressed={isVisible}
            aria-controls="password"
          >
            {isVisible ? <EyeOff size={16} strokeWidth={2} aria-hidden="true" /> : <Eye size={16} strokeWidth={2} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert" aria-live="polite">
          {error as string}
        </p>
      )}

      <div
        className="mb-4 mt-3 h-1 w-full overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={strengthScore}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-label="Password strength"
      >
        <div className={`h-full ${getStrengthColor(strengthScore)} transition-all duration-500 ease-out`} style={{ width: `${(strengthScore / 4) * 100}%` }} />
      </div>

      <p id={`${id}-description`} className="mb-2 text-sm font-medium text-foreground">
        {getStrengthText(strengthScore)}. Must contain:
      </p>

      <ul className="space-y-1.5" aria-label="Password requirements">
        {strength.map((req, index) => (
          <li key={index} className="flex items-center gap-2">
            {req.met ? (
              <Check size={16} className="text-emerald-500" aria-hidden="true" />
            ) : (
              <X size={16} className="text-muted-foreground/80" aria-hidden="true" />
            )}
            <span className={`text-xs ${req.met ? 'text-emerald-600' : 'text-muted-foreground'}`}>
              {req.text}
              <span className="sr-only">{req.met ? ' - Requirement met' : ' - Requirement not met'}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
})

InputWithPassword.displayName = 'InputWithPassword'
