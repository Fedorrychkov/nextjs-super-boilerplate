'use client'

import { useMemo } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { UpdateUserDto, type UserModel, UserRole, UserStatus } from '~/api/user'
import { DefaultMultiselectField } from '~/components/Fields'
import { Option } from '~/components/ui'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog'
import { useRegister } from '~/hooks/useRegister'
import { AppMessageKey } from '~/lib/i18n'
import { useT } from '~/providers'

type Props = {
  isOpen?: boolean
  isLoading?: boolean
  user: UserModel
  toggle?: () => void
  disabled?: boolean
  onSubmit?: (dto: Partial<UpdateUserDto>) => Promise<{ success: boolean; message: string } | undefined>
}

const roles: Option[] = [
  {
    value: UserRole.ADMIN,
    label: 'user.roles.admin' as const,
  },
  {
    value: UserRole.USER,
    label: 'user.roles.user' as const,
  },
  {
    value: UserRole.EDITOR,
    label: 'user.roles.editor' as const,
  },
]

const status: Option[] = [
  {
    value: UserStatus.ACTIVE,
    label: 'user.statuses.active' as const,
  },
  {
    value: UserStatus.BLOCKED,
    label: 'user.statuses.blocked' as const,
  },
]

export const UpdateByAdminUserDialog = (props: Props) => {
  const t = useT()
  const { isOpen, toggle, onSubmit: defaultOnSubmit, isLoading, disabled } = props

  const roleOptions = useMemo(() => {
    return roles.map((role) => ({ ...role, label: t(role.label as AppMessageKey) }))
  }, [t])

  const statusOptions = useMemo(() => {
    return status.map((status) => ({ ...status, label: t(status.label as AppMessageKey) }))
  }, [t])

  const form = useForm<Omit<UpdateUserDto, 'role' | 'status'> & { role: Option[]; status: Option[] }>({
    defaultValues: {
      role: [roleOptions.find((role) => role.value === props.user.role) ?? roleOptions[0]],
      status: [statusOptions.find((status) => status.value === props.user.status) ?? statusOptions[0]],
    },
    mode: 'onChange',
  })

  const { register, formState, handleSubmit } = form
  const { errors, isDirty } = formState

  const { ref: refRole, ...roleField } = useRegister({
    ...register('role', {
      required: {
        value: true,
        message: t('common.requiredField'),
      },
    }),
    errors,
    required: true,
  })

  const { ref: refStatus, ...statusField } = useRegister({
    ...register('status', {
      required: {
        value: true,
        message: t('common.requiredField'),
      },
    }),
    errors,
    required: true,
  })

  const onSubmit = async (dto: Omit<UpdateUserDto, 'role' | 'status'> & { role: Option[]; status: Option[] }) => {
    const result = await defaultOnSubmit?.({
      ...dto,
      id: props.user.id,
      role: dto.role?.[0]?.value as UserRole,
      status: dto.status?.[0]?.value as UserStatus,
    })

    if (result?.success) {
      form.reset()
      toggle?.()
    }

    return result
  }

  const onOpenChange = (open: boolean) => {
    if (!open) {
      form.reset()
    }

    toggle?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal>
      <DialogContent className="sm:max-w-[425px]" isOverlayClosable={false}>
        <DialogHeader>
          <DialogTitle>{t('user.messages.userUpdateDialog.title', { email: props.user.email })}</DialogTitle>
          <DialogDescription>{t('user.messages.userUpdateDialog.description', { email: props.user.email })}</DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form onSubmit={handleSubmit(onSubmit)} className="w-full">
            <div className="flex flex-col gap-4 py-4">
              <DefaultMultiselectField
                updateBySelected
                disabled={isLoading || disabled}
                ref={refRole}
                {...roleField}
                options={roleOptions}
                name="role"
                label={t('user.fields.role')}
              />
              <DefaultMultiselectField
                updateBySelected
                disabled={isLoading || disabled}
                ref={refStatus}
                {...statusField}
                options={statusOptions}
                name="status"
                label={t('user.fields.status')}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isLoading || disabled || !isDirty} isLoading={isLoading}>
                {t('user.messages.userUpdateDialog.update')}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  )
}
