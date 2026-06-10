import { forwardRef, useId } from 'react'

import { Input } from '~/components/ui/fields/input'
import { Label } from '~/components/ui/fields/label'
import { cn } from '~/utils/cn'

export type InputFieldProps = React.ComponentProps<'input'> & {
  name: string
  placeholder?: string
  hintText?: string | React.ReactNode
  additionalComponent?: string | React.ReactNode
  additionalLeftComponent?: string | React.ReactNode
  additionalRightComponent?: string | React.ReactNode
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
  /** HTML `list` — pairs with `<datalist id={…}>`. */
  list?: string
}

export const InputField = forwardRef<HTMLInputElement, InputFieldProps>((props, ref) => {
  const {
    label,
    additionalAlignment = null,
    additionalComponent = null,
    additionalLeftComponent = null,
    additionalRightComponent = null,
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
    list,
    ...restProps
  } = props

  const id = useId()

  return (
    <div className={cn('min-w-[120px] w-full flex flex-col gap-1', classNames?.root)}>
      <Label htmlFor={id} className={classNames?.label}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <div
        className={cn('relative', {
          'flex w-full gap-4': !!additionalComponent || !!additionalLeftComponent || !!additionalRightComponent,
          'flex-row-reverse': !!additionalComponent && additionalAlignment === 'left',
        })}
      >
        {additionalLeftComponent ? (
          <div className={cn('h-fit absolute top-0 bottom-0 left-0 h-full flex items-center justify-center')}>{additionalLeftComponent}</div>
        ) : null}
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
          list={list}
          aria-describedby={`${id}-description`}
          {...restProps}
        />
        {additionalComponent ? (
          <div
            className={cn('h-fit absolute top-0 bottom-0 translate-y-[25%]', {
              'left-1': additionalAlignment === 'left',
              'right-1': additionalAlignment === 'right',
            })}
          >
            {additionalComponent}
          </div>
        ) : null}
        {additionalRightComponent ? (
          <div className={cn('h-fit absolute top-0 bottom-0 right-0 h-full flex items-center justify-center')}>{additionalRightComponent}</div>
        ) : null}
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
