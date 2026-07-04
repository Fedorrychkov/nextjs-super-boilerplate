'use client'

import { forwardRef, ReactNode, useId } from 'react'

import { Checkbox, Label, Typography } from '~/components/ui'

export type CheckboxFieldProps = {
  name: string
  label?: ReactNode
  subLabel?: string
  description?: string
  checked?: boolean
  disabled?: boolean
  required?: boolean
  error?: string
  onCheckedChange?: (checked: boolean) => void
  onClick?: React.FormEventHandler<HTMLButtonElement>
  onChange?: React.FormEventHandler<HTMLButtonElement>
}

export const CheckboxField = forwardRef<HTMLButtonElement, CheckboxFieldProps>((props, ref) => {
  const id = useId()
  const { label, subLabel, description, checked, disabled, required, error, onCheckedChange, onClick, onChange, name } = props

  return (
    <div className="flex items-start gap-2">
      <Checkbox
        ref={ref}
        id={id}
        name={name}
        checked={checked}
        disabled={disabled}
        required={required}
        aria-describedby={`${id}-description`}
        onCheckedChange={(value) => onCheckedChange?.(Boolean(value))}
        onClick={onClick}
        onChange={onChange}
      />
      <div className="grid grow gap-2">
        {label || subLabel ? (
          <Label htmlFor={id}>
            {label}{' '}
            {subLabel && (
              <Typography asTag="span" className="text-xs font-normal leading-[inherit] text-muted-foreground">
                ({subLabel})
              </Typography>
            )}
          </Label>
        ) : null}
        {description && (
          <Typography id={`${id}-description`} className="text-xs text-muted-foreground">
            {description}
          </Typography>
        )}
        {error && <Typography className="text-xs text-red-500">{error}</Typography>}
      </div>
    </div>
  )
})

CheckboxField.displayName = 'CheckboxField'
