'use client'

import isArray from 'lodash/isArray'
import isNil from 'lodash/isNil'
import { forwardRef } from 'react'

import { Label, Option } from '~/components/ui'
import MultipleSelector, { MultipleSelectorRef } from '~/components/ui/multiselect'
import { Spinner } from '~/components/ui/spinner-1'
import { cn } from '~/utils/cn'

export type MultiselectFieldProps = {
  options?: Option[]
  value?: Option[] | Option | null
  label?: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  isLoading?: boolean
  error?: React.ReactNode
  updateBySelected?: boolean
  emptyIndicator?: React.ReactNode
  className?: string
  maxSelected?: number
  onChange?: (options: Option[]) => void
}

export const MultiselectField = forwardRef<MultipleSelectorRef, MultiselectFieldProps>(
  ({ options, onChange, maxSelected = 1, value, className, label, updateBySelected, placeholder, required, error, isLoading, disabled, emptyIndicator }, _) => {
    return (
      <div className={cn('flex flex-col gap-2', className)}>
        <Label isError={!!error} className="flex flex-row items-start gap-2">
          <span>
            {label} {required && <span className="text-destructive">*</span>}
          </span>
          {isLoading && <Spinner size={16} />}
        </Label>
        <MultipleSelector
          commandProps={{
            label: 'Choose value',
          }}
          maxSelected={maxSelected}
          disabled={disabled}
          onChange={onChange}
          updateBySelected={updateBySelected}
          isError={!!error}
          value={isNil(value) ? [] : isArray(value) ? value : [value]}
          defaultOptions={options}
          options={options}
          placeholder={placeholder}
          hideClearAllButton
          hidePlaceholderWhenSelected
          emptyIndicator={emptyIndicator ?? <p className="text-center text-sm">No available values</p>}
        />

        {error && (
          <p className="mt-2 text-xs text-destructive" role="alert" aria-live="polite">
            {error as string}
          </p>
        )}
      </div>
    )
  },
)

MultiselectField.displayName = 'MultiselectField'
