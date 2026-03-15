'use client'

import { KeyRound, Shield, ShieldOff } from 'lucide-react'
import { useState } from 'react'

import { CopyContainer } from '~/components/Blocks/CopyContainer'
import { ImageLoader } from '~/components/Containers'
import { Skeleton } from '~/components/Loaders'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, Typography } from '~/components/ui'
import { useNotify } from '~/providers/notify'
import { useMfaConfirmMutation, useMfaDisableMutation, useMfaSetupMutation, useMfaStatusQuery } from '~/query/auth'
import { cp } from '~/utils/cp'

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/'
const QR_SIZE = 200

export function ProfileMfaBlock() {
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
      notify('Failed to start 2FA setup', 'destructive')
    }
  }

  const handleConfirmMfa = async () => {
    if (!confirmCode.trim()) {
      notify('Enter the code from your app', 'warning')

      return
    }
    try {
      await confirmMutation.mutateAsync(confirmCode.trim())
      setSetupStep('idle')
      setSetupData(null)
      setConfirmCode('')
      await refetchMfaStatus()
      notify('Two-factor authentication enabled', 'success')
    } catch (_e) {
      notify('Invalid code. Try again.', 'destructive')
    }
  }

  const handleDisableMfa = async () => {
    if (!disablePassword.trim()) {
      notify('Enter your password', 'warning')

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
      notify('Two-factor authentication disabled', 'success')
    } catch (_e) {
      notify('Failed to disable 2FA. Check password.', 'destructive')
    }
  }

  const copyAllBackupCodes = () => {
    if (!setupData?.backupCodes.length) return
    cp.copy(setupData.backupCodes.join('\n'))
    notify('Backup codes copied', 'success')
  }

  if (mfaStatus === undefined) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <Typography variant="Body/M/Regular">Loading security settings…</Typography>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-muted-foreground shrink-0" />
        <Typography variant="heading-3">Two-factor authentication (2FA)</Typography>
      </div>

      {!mfaEnabled && setupStep === 'idle' && (
        <div className="space-y-3">
          <Typography variant="Body/M/Regular" className="text-muted-foreground">
            Add an extra layer of security by enabling TOTP (Google Authenticator, etc.).
          </Typography>
          <Button onClick={handleStartSetup} disabled={setupMutation.isLoading}>
            {setupMutation.isLoading ? 'Starting…' : 'Enable 2FA'}
          </Button>
        </div>
      )}

      {!mfaEnabled && setupStep === 'show-codes' && setupData && (
        <div className="space-y-4">
          <Typography variant="Body/M/Regular">Scan the QR code with your authenticator app, or enter the secret manually.</Typography>
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <ImageLoader
              src={`${QR_API}?size=${QR_SIZE}x${QR_SIZE}&data=${encodeURIComponent(setupData.otpauthUrl)}`}
              alt="QR code for 2FA"
              width={QR_SIZE}
              height={QR_SIZE}
              defaultPlaceholder={<Skeleton className="w-[200px] h-[200px]" />}
              className="rounded border bg-white"
            />
            <div className="flex-1 min-w-0">
              <Typography variant="Body/S/Regular" className="text-muted-foreground mb-1">
                Secret key
              </Typography>
              <div className="flex items-center gap-2">
                <CopyContainer
                  className="flex-1 break-all cursor-pointer rounded bg-muted px-2 py-1 text-sm font-mono flex items-start justify-between"
                  content={setupData.secret}
                  successNotifyText="Secret copied"
                >
                  {setupData.secret}
                </CopyContainer>
              </div>
            </div>
          </div>

          <div>
            <Typography variant="Body/S/Regular" className="text-muted-foreground mb-2">
              Backup codes (save them in a safe place; they won’t be shown again)
            </Typography>
            <ul className="grid grid-cols-2 gap-2 mb-2 font-mono text-sm">
              {setupData.backupCodes.map((code, i) => (
                <CopyContainer
                  key={[code, i].join('-')}
                  className="flex items-center cursor-pointer justify-between rounded bg-muted px-2 py-1"
                  content={code}
                  successNotifyText="Code copied"
                >
                  {code}
                </CopyContainer>
              ))}
            </ul>
            <Button type="button" variant="outline" size="sm" onClick={copyAllBackupCodes}>
              Copy all backup codes
            </Button>
          </div>

          <Button onClick={() => setSetupStep('confirm')}>I’ve saved the codes, continue</Button>
        </div>
      )}

      {!mfaEnabled && setupStep === 'confirm' && (
        <div className="space-y-3">
          <Typography variant="Body/M/Regular">Enter the 6-digit code from your authenticator app to activate 2FA.</Typography>
          <div className="flex gap-2">
            <input
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
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button onClick={handleConfirmMfa} disabled={confirmMutation.isLoading || confirmCode.length < 6}>
              {confirmMutation.isLoading ? 'Checking…' : 'Confirm'}
            </Button>
          </div>
          <Button type="button" variant="outline" onClick={() => setSetupStep('show-codes')}>
            Back
          </Button>
        </div>
      )}

      {mfaEnabled && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <Shield className="h-4 w-4" />
            <Typography variant="Body/M/Regular">2FA is enabled</Typography>
          </div>
          <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <ShieldOff className="h-4 w-4 mr-2" />
                Disable 2FA
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Disable two-factor authentication</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Enter your password. You can also enter a current 2FA code for extra verification.</p>
              <input
                type="password"
                placeholder="Password"
                value={disablePassword}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDisableMfa()
                  }
                }}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                type="text"
                inputMode="numeric"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleDisableMfa()
                  }
                }}
                placeholder="2FA code (optional)"
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDisableOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleDisableMfa} disabled={disableMutation.isLoading}>
                  {disableMutation.isLoading ? 'Disabling…' : 'Disable 2FA'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}
