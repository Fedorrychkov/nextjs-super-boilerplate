'use client'

import get from 'lodash/get'
import { forwardRef } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

import { CheckboxField } from '../Input'

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
        <CheckboxField
          ref={ref}
          name={rest.name}
          label={label}
          subLabel={subLabel}
          description={description}
          disabled={disabled}
          required={required}
          error={error}
          checked={Boolean(value)}
          onCheckedChange={(checked) => {
            defaultOnChange(checked)
          }}
          onClick={onClick}
          onChange={onChange}
        />
      )}
    />
  )
})

DefaultCheckbox.displayName = 'DefaultCheckbox'
