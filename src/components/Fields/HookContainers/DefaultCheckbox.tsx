'use client'

import get from 'lodash/get'
import { forwardRef, useId } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

import { Checkbox, Label } from '~/components/ui'

type Props = {
  label?: string
  subLabel?: string
  description?: string
  name: string
  error?: string
  disabled?: boolean
  required?: boolean
  onChange?: React.FormEventHandler<HTMLButtonElement>
  onClick?: React.FormEventHandler<HTMLButtonElement>
}

export const DefaultCheckbox = forwardRef<HTMLButtonElement, Props>((props, ref) => {
  const id = useId()
  const { onChange, onClick, label, description, disabled, error: defaultError, subLabel, required, ...rest } = props

  const {
    watch,
    formState: { errors },
  } = useFormContext()

  const error = defaultError ?? (get(errors, rest.name)?.message as string)

  const value = watch(rest.name)

  return (
    <Controller
      name={rest.name}
      render={({ field: { onChange: defaultOnChange } }) => (
        <div className="flex items-start gap-2">
          <Checkbox
            ref={ref}
            onCheckedChange={(checked) => {
              defaultOnChange(checked)
            }}
            disabled={disabled}
            onClick={(e) => {
              onClick?.(e)
              onChange?.(e)
              defaultOnChange(e)
            }}
            defaultChecked={value}
            value={value}
            id={id}
            aria-describedby={`${id}-description`}
            required={required}
            {...rest}
          />
          <div className="grid grow gap-2">
            <Label htmlFor={id}>
              {label} {subLabel && <span className="text-xs font-normal leading-[inherit] text-muted-foreground">({subLabel})</span>}
            </Label>
            {description && (
              <p id={`${id}-description`} className="text-xs text-muted-foreground">
                {description}
              </p>
            )}
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>
        </div>
      )}
    />
  )
})

DefaultCheckbox.displayName = 'DefaultCheckbox'
