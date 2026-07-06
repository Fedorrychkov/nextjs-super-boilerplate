'use client'

import { KeyRound, Shield, ShieldOff } from 'lucide-react'
import { useState } from 'react'

import { CopyContainer } from '~/components/Blocks/CopyContainer'
import { ImageLoader } from '~/components/Containers'
import { Skeleton } from '~/components/Loaders'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Typography } from '~/components/ui'
import { Input } from '~/components/ui/fields/input'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useMfaConfirmMutation, useMfaDisableMutation, useMfaSetupMutation, useMfaStatusQuery } from '~/query/auth'
import { cp } from '~/utils/cp'

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/'
const QR_SIZE = 200

export function ProfileMfaBlock() {
  const t = useT()
  const { data: mfaStatus, refetch: refetchMfaStatus } = useMfaStatusQuery(true)
  const setupMutation = useMfaSetupMutation()
  const confirmMutation = useMfaConfirmMutation()
  const disableMutation = useMfaDisableMutation()
  const { notify } = useNotify()

  const [setupStep, setSetupStep] = useState<'idle' | 'show-codes' | 'confirm'>('idle')
  const [setupData, setSetupData] = useState<{
    otpauthUrl: string
    secret: string
    backupCodes: string[]
  } | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [disableOpen, setDisableOpen] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [disableCode, setDisableCode] = useState('')

  const mfaEnabled = mfaStatus?.mfaEnabled ?? false

  const handleStartSetup = async () => {
    try {
      const result = await setupMutation.mutateAsync()
      setSetupData({
        otpauthUrl: result.otpauthUrl,
        secret: result.secret,
        backupCodes: result.backupCodes,
      })
      setSetupStep('show-codes')
    } catch (_e) {
      notify(t('auth.errors.failedToStart2FASetup'), 'destructive')
    }
  }

  const handleConfirmMfa = async () => {
    if (!confirmCode.trim()) {
      notify(t('auth.errors.enterCodeFromApp'), 'warning')

      return
    }
    try {
      await confirmMutation.mutateAsync(confirmCode.trim())
      setSetupStep('idle')
      setSetupData(null)
      setConfirmCode('')
      await refetchMfaStatus()
      notify(t('auth.ui.twoFactorAuthenticationEnabled'), 'success')
    } catch (_e) {
      notify(t('auth.errors.invalidCodeTryAgain'), 'destructive')
    }
  }

  const handleDisableMfa = async () => {
    if (!disablePassword.trim()) {
      notify(t('auth.errors.enterPassword'), 'warning')

      return
    }
    try {
      await disableMutation.mutateAsync({
        password: disablePassword,
        ...(disableCode.trim() && { code: disableCode.trim() }),
      })
      setDisableOpen(false)
      setDisablePassword('')
      setDisableCode('')
      await refetchMfaStatus()
      notify(t('auth.ui.twoFactorAuthenticationDisabled'), 'success')
    } catch (_e) {
      notify(t('auth.errors.failedToDisable2FACheckPassword'), 'destructive')
    }
  }

  const copyAllBackupCodes = () => {
    if (!setupData?.backupCodes.length) return
    cp.copy(setupData.backupCodes.join('\n'))
    notify(t('auth.ui.backupCodesCopied'), 'success')
  }

  if (mfaStatus === undefined) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <Typography variant="Body/M/Regular">{t('auth.ui.loadingSecuritySettings')}</Typography>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-muted-foreground shrink-0" />
        <Typography variant="heading-3">{t('auth.ui.twoFactorAuthentication2fa')}</Typography>
      </div>

      {!mfaEnabled && setupStep === 'idle' && (
        <div className="space-y-3">
          <Typography variant="Body/M/Regular" className="text-muted-foreground">
            {t('auth.ui.addAnExtraLayerOfSecurityByEnablingTOTPGoogleAuthenticatorEtc')}
          </Typography>
          <Button onClick={handleStartSetup} disabled={setupMutation.isLoading}>
            {setupMutation.isLoading ? t('auth.ui.starting') : t('auth.ui.enable2fa')}
          </Button>
        </div>
      )}

      {!mfaEnabled && setupStep === 'show-codes' && setupData && (
        <div className="space-y-4">
          <Typography variant="Body/M/Regular">{t('auth.ui.scanTheQRCodeWithYourAuthenticatorAppOrEnterTheSecretManually')}</Typography>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <ImageLoader
              src={`${QR_API}?size=${QR_SIZE}x${QR_SIZE}&data=${encodeURIComponent(setupData.otpauthUrl)}`}
              alt={t('auth.ui.qrCodeFor2FA')}
              width={QR_SIZE}
              height={QR_SIZE}
              defaultPlaceholder={<Skeleton className="w-[200px] h-[200px]" />}
              className="rounded border bg-white"
            />
            <div className="flex-1 min-w-0">
              <Typography variant="Body/S/Regular" className="text-muted-foreground mb-1">
                {t('auth.ui.secretKey')}
              </Typography>
              <div className="flex items-center gap-2">
                <CopyContainer
                  className="flex-1 break-all cursor-pointer rounded bg-muted px-2 py-1 text-sm font-mono flex items-start justify-between"
                  content={setupData.secret}
                  successNotifyText={t('auth.ui.secretCopied')}
                >
                  {setupData.secret}
                </CopyContainer>
              </div>
            </div>
          </div>

          <div>
            <Typography variant="Body/S/Regular" className="text-muted-foreground mb-2">
              {t('auth.ui.backupCodesSaveThemInASafePlaceTheyWontBeShownAgain')}
            </Typography>
            <ul className="grid grid-cols-2 gap-2 mb-2 font-mono text-sm">
              {setupData.backupCodes.map((code, i) => (
                <CopyContainer
                  key={[code, i].join('-')}
                  className="flex items-center cursor-pointer justify-between rounded bg-muted px-2 py-1"
                  content={code}
                  successNotifyText={t('auth.ui.codeCopied')}
                >
                  {code}
                </CopyContainer>
              ))}
            </ul>
            <Button type="button" variant="outline" size="sm" onClick={copyAllBackupCodes}>
              {t('auth.ui.copyAllBackupCodes')}
            </Button>
          </div>

          <Button onClick={() => setSetupStep('confirm')}>{t('auth.ui.iveSavedTheCodesContinue')}</Button>
        </div>
      )}

      {!mfaEnabled && setupStep === 'confirm' && (
        <div className="space-y-3">
          <Typography variant="Body/M/Regular">{t('auth.ui.enterThe6DigitCodeFromYourAuthenticatorAppToActivate2FA')}</Typography>
          <div className="flex gap-2">
            <Input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={8}
              placeholder="000000"
              value={confirmCode}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmMfa()
                }
              }}
              onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
              className="flex-1"
            />
            <Button onClick={handleConfirmMfa} disabled={confirmMutation.isLoading || confirmCode.length < 6}>
              {confirmMutation.isLoading ? t('auth.ui.checking') : t('auth.ui.confirm')}
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={() => setSetupStep('show-codes')}>
            {t('auth.ui.back')}
          </Button>
        </div>
      )}

      {mfaEnabled && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Shield className="h-4 w-4" />
            <Typography variant="Body/M/Regular">{t('auth.ui.twoFactorAuthenticationEnabledShort')}</Typography>
          </div>
          <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <ShieldOff className="h-4 w-4 mr-2" />
                {t('auth.ui.disable2fa')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('auth.ui.disableTwoFactorAuthentication')}</DialogTitle>
              </DialogHeader>
              <Typography className="text-sm text-muted-foreground">
                {t('auth.ui.enterYourPasswordYouCanAlsoEnterACurrent2FACodeForExtraVerification')}
              </Typography>
              <Input
                type="password"
                placeholder="Password"
                value={disablePassword}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDisableMfa()
                  }
                }}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="w-full"
              />
              <Input
                type="text"
                inputMode="numeric"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDisableMfa()
                  }
                }}
                placeholder={t('auth.ui.twoFactorAuthenticationCodeOptional')}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                className="w-full"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDisableOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={handleDisableMfa} disabled={disableMutation.isLoading}>
                  {disableMutation.isLoading ? t('auth.ui.disabling2fa') : t('auth.ui.disable2fa')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}
