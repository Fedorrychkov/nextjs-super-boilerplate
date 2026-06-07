'use client'

import { KeyRound } from 'lucide-react'
import * as React from 'react'

import { InputField } from '~/components/Fields'
import { Button, Typography } from '~/components/ui'
import { useT } from '~/providers'

type Props = {
  onSubmit: (code: string) => void
  onBack: () => void
  isLoading: boolean
}

const MfaCodeBlock = (props: Props) => {
  const t = useT()
  const [code, setCode] = React.useState('')
  const [error, setError] = React.useState('')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const trimmed = code.replace(/\D/g, '')

    if (!trimmed) {
      setError(t('auth.errors.enterCodeFromApp'))

      return
    }
    setError('')
    props.onSubmit(trimmed)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-transparent rounded-xl z-1">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-gradient-to-b from-sky-50/50 to-background dark:from-sky-900/50 rounded-3xl shadow-xl shadow-opacity-10 dark:shadow-sky-900/50 p-8 flex flex-col items-center border border-blue-100 dark:border-background text-foreground"
      >
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-background mb-6 shadow-lg shadow-opacity-5">
          <KeyRound className="w-7 h-7 text-foreground" />
        </div>
        <Typography variant="Body/L/Semibold" asTag="h2" className="mb-2 text-center">
          {t('auth.ui.twoFactorAuthentication')}
        </Typography>
        <Typography variant="Body/M/Regular" asTag="p" className="mb-6 text-center text-muted-foreground">
          {t('auth.ui.enterCodeFromAppOrBackupCodeDescription')}
        </Typography>
        <div className="w-full flex flex-col gap-3 mb-4">
          <InputField
            placeholder={t('auth.password.totpCode')}
            label={t('auth.password.totpCode')}
            type="text"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={code}
            disabled={props.isLoading}
            classNames={{
              input: 'w-full pl-10 pr-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm',
            }}
            additionalLeftComponent={
              <span className="ml-3 text-gray-400">
                <KeyRound className="w-4 h-4" />
              </span>
            }
            error={error}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={props.isLoading}
          className="w-full bg-gradient-to-b from-gray-700 to-gray-900 text-white dark:from-gray-700 dark:to-gray-900 dark:text-foreground dark:hover:text-foreground font-medium py-2 rounded-xl shadow hover:brightness-105 cursor-pointer transition mb-4 mt-2"
        >
          {props.isLoading ? t('auth.ui.checking') : t('auth.ui.continue')}
        </button>
        <Button type="button" variant="ghost" className="w-full" onClick={props.onBack}>
          {t('auth.ui.backToSignIn')}
        </Button>
      </form>
    </div>
  )
}

export { MfaCodeBlock }
