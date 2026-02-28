'use client'

import get from 'lodash/get'
import isNil from 'lodash/isNil'
import { forwardRef } from 'react'
import { Controller, useFormContext } from 'react-hook-form'

import { TextAreaField, TextAreaFieldProps } from '~/components/Fields'

export const DefaultTextAreaContainer = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>((props, ref) => {
  const { onChange, ...rest } = props

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
        <TextAreaField
          ref={ref}
          {...rest}
          value={isNil(value) ? '' : value}
          classNames={{
            root: 'w-full',
            ...rest.classNames,
          }}
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

DefaultTextAreaContainer.displayName = 'DefaultTextAreaContainer'
