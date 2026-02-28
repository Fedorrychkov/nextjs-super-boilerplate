'use client'

import get from 'lodash/get'
import isNil from 'lodash/isNil'
import { forwardRef } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

import { InputField, InputFieldProps } from '~/components/Fields'

export const DefaultFieldContainer = forwardRef<HTMLInputElement, InputFieldProps>((props, ref) => {
  const { onChange, onKeyDown, ...rest } = props

  const {
    watch,
    formState: { errors },
  } = useFormContext()

  const error = get(errors, rest.name)?.message

  const value = watch(rest.name)

  return (
    <Controller
      name={rest.name}
      render={({ field: { onChange: defaultOnChange } }) => (
        <InputField
          ref={ref}
          {...rest}
          value={isNil(value) ? '' : value}
          classNames={{
            root: 'w-full',
            ...rest.classNames,
          }}
          onKeyDown={onKeyDown}
          error={error as string}
          onChange={(e) => {
            defaultOnChange(e)
            onChange?.(e)
          }}
        />
      )}
    />
  )
})

DefaultFieldContainer.displayName = 'DefaultFieldContainer'
