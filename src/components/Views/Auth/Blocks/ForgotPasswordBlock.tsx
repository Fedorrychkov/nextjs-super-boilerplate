'use client'

import { getPasswordPolicyErrorMessage } from '@lib/validation/password-policy'
import { AxiosError } from 'axios'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { InputField, PasswordField } from '~/components/Fields'
import { Button, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { usePasswordForgotMutation } from '~/query/auth/mutation/usePasswordForgotMutation'
import { useRecoveryCapabilitiesQuery } from '~/query/auth/query/useRecoveryCapabilitiesQuery'

export function ForgotPasswordBlock() {
  const t = useT()
  const router = useRouter()
  const { notify } = useNotify()
  const { data: capabilities } = useRecoveryCapabilitiesQuery(true)
  const { startMutation, completeMutation } = usePasswordForgotMutation()

  const [step, setStep] = useState<'email' | 'verify' | 'support'>('email')
  const [email, setEmail] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [needsEmail, setNeedsEmail] = useState(false)
  const [needsTotp, setNeedsTotp] = useState(false)
  const [emailCode, setEmailCode] = useState('')
  const [totp, setTotp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  if (capabilities && !capabilities.passwordForgotEnabled) {
    return (
      <Typography variant="Body/M/Regular" className="text-muted-foreground">
        {t('auth.password.errors.featureDisabled')}
      </Typography>
    )
  }

  const handleStart = async () => {
    try {
      const result = await startMutation.mutateAsync({ email })

      notify(result.message ?? t('auth.password.messages.forgotStarted'), 'success')

      if (result.supportRequired) {
        setStep('support')

        return
      }

      if (!result.recoveryPossible || !result.pendingId) {
        setStep('support')

        return
      }

      setPendingId(result.pendingId)
      setNeedsEmail(Boolean(result.emailSent))
      setNeedsTotp(Boolean(result.needsTotp))
      setStep('verify')

      if (result.devCode) {
        notify(`Dev code: ${result.devCode}`, 'info')
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')
      } else {
        notify(t('auth.password.errors.emailFailed'), 'destructive')
      }
    }
  }

  const handleComplete = async () => {
    if (!pendingId) return

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
      await completeMutation.mutateAsync({
        pendingId,
        newPassword,
        emailCode: needsEmail ? emailCode : undefined,
        totp: needsTotp ? totp : undefined,
      })
      notify(t('auth.password.messages.forgotSuccess'), 'success')
      router.push('/login')
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')
      } else {
        notify(t('auth.password.errors.factorsIncomplete'), 'destructive')
      }
    }
  }

  if (step === 'support') {
    return (
      <div className="flex flex-col gap-4 max-w-md">
        <Typography variant="Body/M/Regular">{t('auth.recovery.contactSupport')}</Typography>
        <Link href="/login" className="text-sm text-primary underline">
          {t('auth.ui.backToSignIn')}
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 max-w-md w-full">
      {step === 'email' ? (
        <>
          <InputField
            name="email"
            type="email"
            placeholder={t('auth.ui.email')}
            label={t('auth.ui.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={handleStart} disabled={startMutation.isLoading}>
            {t('auth.password.submitRequest')}
          </Button>
        </>
      ) : (
        <>
          {needsEmail && (
            <InputField
              name="emailCode"
              label={t('auth.password.emailCode')}
              placeholder={t('auth.password.emailCode')}
              value={emailCode}
              onChange={(e) => setEmailCode(e.target.value)}
            />
          )}
          {needsTotp && (
            <InputField
              name="totp"
              label={t('auth.password.totpCode')}
              placeholder={t('auth.password.totpCode')}
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
            />
          )}
          <PasswordField
            name="newPassword"
            label={t('auth.password.newPassword')}
            placeholder={t('auth.password.newPassword')}
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordField
            name="confirmPassword"
            label={t('auth.password.confirmPassword')}
            placeholder={t('auth.password.confirmPassword')}
            value={confirmPassword}
            onChange={setConfirmPassword}
            showStrength={false}
          />
          <Button onClick={handleComplete} disabled={completeMutation.isLoading}>
            {t('auth.password.submitConfirm')}
          </Button>
        </>
      )}
      <Link href="/login" className="text-sm text-primary underline">
        {t('auth.ui.backToSignIn')}
      </Link>
    </div>
  )
}
