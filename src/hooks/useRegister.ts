import get from 'lodash/get'
import { ChangeHandler, FieldError, FieldErrorsImpl, FieldValues, Merge, UseFormRegisterReturn } from 'react-hook-form'

type Props = UseFormRegisterReturn<string> & {
  errors: Partial<FieldErrorsImpl<FieldValues>> | (Merge<FieldError, FieldErrorsImpl<FieldValues>> | undefined)[]
  isShowError?: boolean
  withRef?: boolean
  defaultError?: string
}

export type RegisterField = {
  name: string
  error?: boolean | undefined
  helperText?: string | undefined
  onChange: ChangeHandler
  onBlur: ChangeHandler
  min?: string | number | undefined
  max?: string | number | undefined
  maxLength?: number | undefined
  minLength?: number | undefined
  pattern?: string | undefined
  required?: boolean | undefined
  disabled?: boolean | undefined
}

export const useRegister = ({ errors, withRef = true, isShowError = true, defaultError, ...props }: Props) => {
  const name = props.name
  const error = get(errors, name)?.message ?? defaultError

  const { ref, ...restProps } = props

  return {
    ...restProps,
    ...(!!error && isShowError
      ? {
          error,
        }
      : {}),
    ...(withRef ? { ref } : {}),
  }
}

export const handleRegister = ({ errors, withRef = true, isShowError = true, ...props }: Props) => {
  const name = props.name
  const error = get(errors, name)?.message

  const { ref, ...restProps } = props

  return {
    ...restProps,
    ...(!!error && isShowError
      ? {
          error,
        }
      : {}),
    ...(withRef ? { ref } : {}),
  }
}
