'use client'

import { getPasswordPolicyErrorMessage } from '@lib/validation/password-policy'
import { AxiosError } from 'axios'
import { ChevronDown, KeyRound } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { InputField, PasswordField } from '~/components/Fields'
import { Button, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { usePasswordChangeMutation } from '~/query/auth/mutation/usePasswordChangeMutation'
import { useOAuthAccountsQuery } from '~/query/auth/query/useOAuthAccountsQuery'
import { useRecoveryCapabilitiesQuery } from '~/query/auth/query/useRecoveryCapabilitiesQuery'
import { cn } from '~/utils/cn'

export function ProfileChangePasswordPanel() {
  const t = useT()
  const router = useRouter()
  const { notify } = useNotify()
  const [hydrated, setHydrated] = useState(false)
  const { data: capabilities } = useRecoveryCapabilitiesQuery(hydrated)
  const { data: oauthAccounts } = useOAuthAccountsQuery(hydrated)
  const { requestMutation, confirmMutation } = usePasswordChangeMutation()

  useEffect(() => {
    queueMicrotask(() => {
      setHydrated(true)
    })
  }, [])

  const [expanded, setExpanded] = useState(false)
  const [step, setStep] = useState<'form' | 'confirm'>('form')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [needsEmail, setNeedsEmail] = useState(false)
  const [needsTotp, setNeedsTotp] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [totp, setTotp] = useState('')

  if (!hydrated) {
    return null
  }

  if (capabilities && !capabilities.passwordChangeEnabled) {
    return null
  }

  if (oauthAccounts && !oauthAccounts.hasPassword) {
    return null
  }

  if (capabilities && capabilities.selfServicePossible === false) {
    return (
      <div className="flex flex-col rounded-lg border bg-card p-4 space-y-2">
        <Typography variant="heading-3">{t('auth.password.title')}</Typography>
        <Typography variant="Body/S/Regular" className="text-muted-foreground">
          {t('auth.recovery.contactSupport')}
        </Typography>
      </div>
    )
  }

  const handleRequest = async () => {
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
      const result = await requestMutation.mutateAsync({ currentPassword, newPassword })
      setPendingId(result.pendingId)
      setNeedsEmail(Boolean(result.emailSent))
      setNeedsTotp(Boolean(result.needsTotp))
      setStep('confirm')
      notify(t('auth.password.messages.changeStarted'), 'success')

      if (result.devCode) {
        notify(`Dev code: ${result.devCode}`, 'info')
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')
      } else {
        notify(t('errors.unknown'), 'destructive')
      }
    }
  }

  const handleConfirm = async () => {
    if (!pendingId) return

    try {
      await confirmMutation.mutateAsync({
        pendingId,
        emailCode: needsEmail ? emailCode : undefined,
        totp: needsTotp ? totp : undefined,
      })
      notify(t('auth.password.messages.changeSuccess'), 'success')
      router.push('/login')
    } catch {
      notify(t('auth.password.errors.factorsIncomplete'), 'destructive')
    }
  }

  const handleToggle = () => {
    setExpanded((prev) => {
      if (prev) {
        setStep('form')
        setPendingId(null)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setEmailCode('')
        setTotp('')
      }

      return !prev
    })
  }

  return (
    <div className="flex flex-col rounded-lg border bg-card p-4 space-y-4">
      <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={handleToggle}>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          <Typography variant="heading-3">{t('auth.password.title')}</Typography>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Typography variant="Body/XS/Regular">{expanded ? t('auth.password.collapse') : t('auth.password.expand')}</Typography>
          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
        </div>
      </button>

      {expanded && (
        <>
          {step === 'form' ? (
            <div className="flex flex-col gap-3 max-w-md">
              <InputField
                name="currentPassword"
                type="password"
                placeholder={t('auth.password.currentPassword')}
                label={t('auth.password.currentPassword')}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
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
              <Button onClick={handleRequest} disabled={requestMutation.isLoading}>
                {t('auth.password.submitRequest')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-w-md">
              {needsEmail && (
                <InputField name="emailCode" placeholder={t('auth.password.emailCode')} value={emailCode} onChange={(e) => setEmailCode(e.target.value)} />
              )}
              {needsTotp && <InputField name="totp" placeholder={t('auth.password.totpCode')} value={totp} onChange={(e) => setTotp(e.target.value)} />}
              <Button onClick={handleConfirm} disabled={confirmMutation.isLoading}>
                {t('auth.password.submitConfirm')}
              </Button>
              <Button variant="ghost" onClick={() => setStep('form')}>
                {t('auth.ui.back')}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
