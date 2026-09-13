'use client'

import { useState } from 'react'

import { TextAreaField, TextAreaFieldProps } from '~/components/Fields'

export const TextAreaWithState = (props: TextAreaFieldProps) => {
  const [value, setValue] = useState('')

  return (
    <TextAreaField
      label="Text Area With State"
      placeholder="Text Area With State"
      value={value}
      maxLength={250}
      isShowMaxBagde
      onChange={(e) => setValue(e.target.value)}
      {...props}
    />
  )
}
