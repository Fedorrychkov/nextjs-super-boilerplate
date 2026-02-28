import { forwardRef, useId } from 'react'

import { Textarea } from '~/components/ui'
import { Label } from '~/components/ui/fields/label'
import { cn } from '~/utils/cn'

import { InputFieldProps } from './InputField'

export type TextAreaFieldProps = Omit<InputFieldProps, 'type' | 'onChange'> & {
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
} & React.ComponentProps<'textarea'>

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>((props, ref) => {
  const { label, classNames, placeholder, required, value, onChange, readOnly, defaultValue, disabled, error, name, hintText, ...restProps } = props

  const id = useId()

  return (
    <div className={cn('min-w-[300px] flex flex-col gap-1', classNames?.root)}>
      <Label htmlFor={id} className={classNames?.label}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Textarea
        ref={ref}
        id={id}
        name={name}
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
        required={required}
        aria-describedby={`${id}-description`}
        {...restProps}
      />
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

TextAreaField.displayName = 'TextAreaField'
