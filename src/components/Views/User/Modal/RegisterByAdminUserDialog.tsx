'use client'

import { useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { RegisterByAdminDto } from '~/api/auth/types'
import { UserModel, UserRole } from '~/api/user'
import { DefaultFieldContainer, DefaultMultiselectField, InputWithPassword } from '~/components/Fields'
import { Option, Typography } from '~/components/ui'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog'
import { useRegister } from '~/hooks/useRegister'
import { AppMessageKey } from '~/lib/i18n'
import { useT } from '~/providers'

type Props = {
  children: React.ReactNode
  isOpen?: boolean
  isLoading?: boolean
  toggle?: () => void
  onSubmit?: (dto: RegisterByAdminDto) => Promise<{ user: Pick<UserModel, 'id' | 'email' | 'role' | 'status'> | undefined } | undefined>
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

export const RegisterByAdminUserDialog = (props: Props) => {
  const [data, setData] = useState<{ user: (Pick<UserModel, 'id' | 'email' | 'role' | 'status'> & { password: string }) | undefined } | undefined>(undefined)

  const t = useT()
  const { children, isOpen, toggle, onSubmit: defaultOnSubmit, isLoading } = props

  const roleOptions = useMemo(() => {
    return roles.map((role) => ({ ...role, label: t(role.label as AppMessageKey) }))
  }, [t])

  const form = useForm<Omit<RegisterByAdminDto, 'role'> & { role: Option[] }>({
    defaultValues: {
      email: '',
      password: '',
      role: [roleOptions.find((role) => role.value === UserRole.ADMIN)],
    },
    mode: 'onChange',
  })

  const { register, formState, handleSubmit } = form
  const { errors } = formState

  const { ref: refEmail, ...emailField } = useRegister({
    ...register('email', {
      required: {
        value: true,
        message: t('common.requiredField'),
      },
      pattern: {
        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        message: t('common.emailMustContainAtAndDomain'),
      },
    }),
    errors,
    required: true,
  })

  const { ref: refPassword, ...passwordField } = useRegister({
    ...register('password', {
      required: {
        value: true,
        message: t('common.requiredField'),
      },
    }),
    errors,
    required: true,
  })

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

  const onSubmit = async (dto: Omit<RegisterByAdminDto, 'role'> & { role: Option[] }) => {
    const result = await defaultOnSubmit?.({
      ...dto,
      role: dto.role?.[0]?.value as UserRole,
    })

    if (result?.user) {
      setData({
        user: result.user
          ? {
              ...result.user,
              password: dto.password,
            }
          : undefined,
      })

      form.reset()
    }

    return result
  }

  const onOpenChange = (open: boolean) => {
    if (!open) {
      form.reset()
      setData(undefined)
    }

    toggle?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange} modal>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]" isOverlayClosable={false}>
        <DialogHeader>
          <DialogTitle>{t('user.messages.registerByAdminUserDialog.title')}</DialogTitle>
          <DialogDescription>{t('user.messages.registerByAdminUserDialog.description')}</DialogDescription>
        </DialogHeader>
        {data ? (
          <div className="w-full flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Typography variant="Body/S/Regular">{t('user.messages.registerByAdminUserDialog.userRegisteredSuccessfully')}</Typography>
            </div>
            <div className="flex flex-col gap-2">
              <Typography variant="Body/S/Regular">{t('user.messages.registerByAdminUserDialog.login')}:</Typography>
              <Typography variant="Body/L/Semibold">{data?.user?.email}</Typography>
            </div>
            <div className="flex flex-col gap-2">
              <Typography variant="Body/S/Regular">{t('user.messages.registerByAdminUserDialog.password')}:</Typography>
              <Typography variant="Body/L/Semibold">{data?.user?.password}</Typography>
            </div>
          </div>
        ) : (
          <FormProvider {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="w-full">
              <div className="flex flex-col gap-4 py-4">
                <DefaultMultiselectField
                  updateBySelected
                  disabled={isLoading}
                  ref={refRole}
                  {...roleField}
                  options={roleOptions}
                  name="role"
                  label={t('user.fields.role')}
                />
                <DefaultFieldContainer
                  disabled={isLoading}
                  ref={refEmail}
                  {...emailField}
                  type="email"
                  label={t('user.messages.registerByAdminUserDialog.email') as AppMessageKey}
                />
                <InputWithPassword
                  disabled={isLoading}
                  ref={refPassword}
                  {...passwordField}
                  label={t('user.messages.registerByAdminUserDialog.password') as AppMessageKey}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading} isLoading={isLoading}>
                  {t('user.messages.registerByAdminUserDialog.create')}
                </Button>
              </DialogFooter>
            </form>
          </FormProvider>
        )}
      </DialogContent>
    </Dialog>
  )
}
