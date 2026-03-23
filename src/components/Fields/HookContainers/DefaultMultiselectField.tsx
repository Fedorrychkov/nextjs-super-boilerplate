'use client'

import get from 'lodash/get'
import { forwardRef } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

import { Option } from '~/components/ui'
import { MultipleSelectorRef } from '~/components/ui/multiselect'
import { cn } from '~/utils/cn'

import { MultiselectField, MultiselectFieldProps } from '../Input'

type Props = Omit<MultiselectFieldProps, 'onChange'> & {
  options: Option[]
  label?: string
  name: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  isLoading?: boolean
  maxSelected?: number
  className?: string
  error?: React.ReactNode
  updateBySelected?: boolean
  emptyIndicator?: React.ReactNode
}

export const DefaultMultiselectField = forwardRef<MultipleSelectorRef, Props>(
  (
    { options, label, className, name, maxSelected = 1, updateBySelected, placeholder, required, error: defaultError, isLoading, disabled, emptyIndicator },
    _,
  ) => {
    const {
      formState: { errors },
      watch,
    } = useFormContext()
    const error = get(errors, name)?.message
    const value = watch(name)

    const finalError = error || defaultError

    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <Controller
          name={name}
          render={({ field: { onChange: defaultOnChange } }) => (
            <MultiselectField
              options={options}
              onChange={defaultOnChange}
              value={value}
              label={label}
              maxSelected={maxSelected}
              updateBySelected={updateBySelected}
              placeholder={placeholder}
              required={required}
              error={finalError as React.ReactNode}
              isLoading={isLoading}
              disabled={disabled}
              emptyIndicator={emptyIndicator}
            />
          )}
        />
      </div>
    )
  },
)

DefaultMultiselectField.displayName = 'MultiselectField'
