'use client'

import { getPasswordPolicyErrorMessage } from '@lib/validation/password-policy'
import { useState } from 'react'
import { useMutation } from 'react-query'

import { ClientUserApi } from '~/api/user/client'
import { PasswordField } from '~/components/Fields'
import { Button, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'

type Props = {
  userId: string
}

export function AdminUserRecoveryPanel({ userId }: Props) {
  const t = useT()
  const { notify } = useNotify()
  const [newPassword, setNewPassword] = useState('')

  const resetMfaMutation = useMutation(async () => {
    const api = new ClientUserApi()

    return api.adminResetUserMfa(userId)
  })

  const setPasswordMutation = useMutation(async (password: string) => {
    const api = new ClientUserApi()

    return api.adminSetUserPassword(userId, password)
  })

  const handleResetMfa = async () => {
    if (!window.confirm(t('user.adminProfile.userRecovery.resetMfaConfirm'))) {
      return
    }

    try {
      await resetMfaMutation.mutateAsync()
      notify(t('user.adminProfile.userRecovery.resetMfaSuccess'), 'success')
    } catch {
      notify(t('auth.password.errors.featureDisabled'), 'destructive')
    }
  }

  const handleSetPassword = async () => {
    const policyError = getPasswordPolicyErrorMessage(newPassword, t)

    if (policyError) {
      notify(policyError, 'destructive')

      return
    }

    if (!window.confirm(t('user.adminProfile.userRecovery.setPasswordConfirm'))) {
      return
    }

    try {
      await setPasswordMutation.mutateAsync(newPassword)
      setNewPassword('')
      notify(t('user.adminProfile.userRecovery.setPasswordSuccess'), 'success')
    } catch {
      notify(t('auth.password.errors.featureDisabled'), 'destructive')
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border p-4">
      <Typography variant="Body/S/Semibold">{t('user.adminProfile.userRecovery.title')}</Typography>
      <Typography variant="Body/XS/Regular" className="text-muted-foreground">
        {t('user.adminProfile.userRecovery.adminHint')}
      </Typography>
      <Button variant="outline" onClick={handleResetMfa} disabled={resetMfaMutation.isLoading}>
        {t('user.adminProfile.userRecovery.resetMfa')}
      </Button>
      <PasswordField
        name="adminNewPassword"
        label={t('user.adminProfile.userRecovery.newPassword')}
        placeholder={t('user.adminProfile.userRecovery.newPassword')}
        value={newPassword}
        onChange={setNewPassword}
      />
      <Button onClick={handleSetPassword} disabled={setPasswordMutation.isLoading || !newPassword}>
        {t('user.adminProfile.userRecovery.setPassword')}
      </Button>
    </div>
  )
}
