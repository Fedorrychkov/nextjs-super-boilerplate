'use client'

import { getPasswordPolicyErrorMessage } from '@lib/validation/password-policy'
import { AxiosError } from 'axios'
import { KeyRound } from 'lucide-react'
import { useEffect, useState } from 'react'

import { PasswordField } from '~/components/Fields'
import { Button, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useSetPasswordMutation } from '~/query/auth/mutation/useSetPasswordMutation'
import { useOAuthAccountsQuery } from '~/query/auth/query/useOAuthAccountsQuery'

export function ProfileSetPasswordPanel() {
  const t = useT()
  const { notify } = useNotify()
  const [hydrated, setHydrated] = useState(false)
  const { data, refetch } = useOAuthAccountsQuery(hydrated)
  const { setPasswordMutation } = useSetPasswordMutation()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [totp, setTotp] = useState('')

  useEffect(() => {
    queueMicrotask(() => {
      setHydrated(true)
    })
  }, [])

  if (!hydrated || !data) {
    return null
  }

  if (data.hasPassword) {
    return null
  }

  const handleSubmit = async () => {
    if (newPassword !== confirmPassword) {
      notify(t('auth.password.errors.passwordsMismatch'), 'destructive')

      return
    }

    const policyError = getPasswordPolicyErrorMessage(newPassword, t)

    if (policyError) {
      notify(policyError, 'destructive')

      return
    }

    try {
      await setPasswordMutation.mutateAsync({
        newPassword,
        ...(totp.trim() ? { totpCode: totp.trim() } : {}),
      })
      notify(t('auth.oauth.messages.passwordSet'), 'success')
      setNewPassword('')
      setConfirmPassword('')
      setTotp('')
      void refetch()
    } catch (error) {
      const message =
        error instanceof AxiosError && error.response?.data && typeof error.response.data === 'object' && 'message' in error.response.data
          ? String((error.response.data as { message?: unknown }).message ?? '')
          : t('errors.unknown')

      notify(message, 'destructive')
    }
  }

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Typography variant="heading-3">{t('auth.oauth.setPasswordTitle')}</Typography>
      </div>
      <Typography variant="Body/S/Regular" className="text-muted-foreground">
        {t('auth.oauth.setPasswordDescription')}
      </Typography>
      <PasswordField name="newPassword" label={t('auth.password.newPassword')} value={newPassword} onChange={setNewPassword} />
      <PasswordField name="confirmPassword" label={t('auth.password.confirmPassword')} value={confirmPassword} onChange={setConfirmPassword} />
      <PasswordField name="totp" label={t('auth.oauth.totpOptional')} value={totp} onChange={setTotp} />
      <Button type="button" size="sm-md" disabled={setPasswordMutation.isLoading} onClick={() => void handleSubmit()}>
        {t('auth.oauth.setPasswordAction')}
      </Button>
    </div>
  )
}
