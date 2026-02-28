import { forwardRef, useId } from 'react'

import { Input } from '~/components/ui/fields/input'
import { Label } from '~/components/ui/fields/label'
import { cn } from '~/utils/cn'

export type InputFieldProps = {
  name: string
  placeholder?: string
  hintText?: string | React.ReactNode
  additionalComponent?: string | React.ReactNode
  additionalAlignment?: 'left' | 'right'
  label?: string
  type?: 'text' | 'email' | 'password' | 'number'
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  readOnly?: boolean
  required?: boolean
  defaultValue?: string
  disabled?: boolean
  error?: string
  classNames?: {
    label?: string
    input?: string
    root?: string
  }
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>((props, ref) => {
  const {
    label,
    additionalAlignment = 'right',
    additionalComponent = null,
    classNames,
    placeholder,
    type,
    required,
    value,
    onChange,
    readOnly,
    defaultValue,
    disabled,
    error,
    name,
    hintText,
    onKeyDown,
    ...restProps
  } = props

  const id = useId()

  return (
    <div className={cn('min-w-[300px] flex flex-col gap-1', classNames?.root)}>
      <Label htmlFor={id} className={classNames?.label}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div
        className={cn({
          'flex w-full gap-4': !!additionalComponent,
          'flex-row-reverse': !!additionalComponent && additionalAlignment === 'left',
        })}
      >
        <Input
          ref={ref}
          id={id}
          name={name}
          onKeyDown={onKeyDown}
          className={cn(
            '',
            {
              'read-only:bg-muted': readOnly,
              'border-destructive/80 text-destructive focus-visible:border-destructive/80 focus-visible:ring-destructive/20': error,
            },
            classNames?.input,
          )}
          value={value}
          onChange={onChange}
          defaultValue={defaultValue}
          readOnly={readOnly}
          disabled={disabled}
          placeholder={placeholder}
          type={type}
          required={required}
          aria-describedby={`${id}-description`}
          {...restProps}
        />
        {additionalComponent}
      </div>
      {error && (
        <p className="mt-2 text-xs text-destructive" role="alert" aria-live="polite">
          {error}
        </p>
      )}
      {hintText && (
        <p className="mt-2 text-xs text-muted-foreground" role="alert" aria-live="polite">
          {hintText}
        </p>
      )}
    </div>
  )
})

InputField.displayName = 'InputField'
