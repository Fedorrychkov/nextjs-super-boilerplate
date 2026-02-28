'use client'

import { isNil } from 'lodash'
import get from 'lodash/get'
import isArray from 'lodash/isArray'
import { forwardRef } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

import { Label, Option } from '~/components/ui'
import MultipleSelector, { MultipleSelectorRef } from '~/components/ui/multiselect'
import { Spinner } from '~/components/ui/spinner-1'

type Props = {
  options: Option[]
  label?: string
  name: string
  placeholder?: string
  required?: boolean
  disabled?: boolean
  isLoading?: boolean
  error?: React.ReactNode
  updateBySelected?: boolean
  emptyIndicator?: React.ReactNode
}

export const MultiselectField = forwardRef<MultipleSelectorRef, Props>(
  ({ options, label, name, updateBySelected, placeholder, required, error: defaultError, isLoading, disabled, emptyIndicator }) => {
    const {
      formState: { errors },
      watch,
    } = useFormContext()
    const error = get(errors, name)?.message
    const value = watch(name)

    const finalError = error || defaultError

    return (
      <div className="flex flex-col gap-2 w-full">
        <Label isError={!!finalError} className="flex flex-row items-start gap-2">
          <span>
            {label} {required && <span className="text-destructive">*</span>}
          </span>
          {isLoading && <Spinner size={16} />}
        </Label>
        <Controller
          name={name}
          render={({ field: { onChange: defaultOnChange } }) => (
            <MultipleSelector
              commandProps={{
                label: 'Выберите значение',
              }}
              maxSelected={1}
              disabled={disabled}
              onChange={(options) => {
                defaultOnChange(options)
              }}
              updateBySelected={updateBySelected}
              isError={!!finalError}
              value={isNil(value) ? [] : isArray(value) ? value : [value]}
              defaultOptions={options}
              options={options}
              placeholder={placeholder}
              hideClearAllButton
              hidePlaceholderWhenSelected
              emptyIndicator={emptyIndicator ?? <p className="text-center text-sm">Нет доступных значений</p>}
            />
          )}
        />

        {finalError && (
          <p className="mt-2 text-xs text-destructive" role="alert" aria-live="polite">
            {finalError as string}
          </p>
        )}
      </div>
    )
  },
)

MultiselectField.displayName = 'MultiselectField'
