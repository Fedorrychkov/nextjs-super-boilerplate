'use client'

import { Typography } from '~/components/ui'
import { ForgotPasswordBlock } from '~/components/Views/Auth/Blocks/ForgotPasswordBlock'
import { useT } from '~/providers'

export default function ForgotPasswordPage() {
  const t = useT()

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-white dark:bg-transparent rounded-xl z-1">
      <div className="w-full max-w-sm bg-gradient-to-b from-sky-50/50 to-background dark:from-sky-900/50 rounded-3xl shadow-xl shadow-opacity-10 dark:shadow-sky-900/50 p-8 flex flex-col items-center justify-center gap-6 p-4 border border-blue-100 dark:border-background text-foreground">
        <Typography variant="heading-2">{t('auth.password.forgotLink')}</Typography>
        <ForgotPasswordBlock />
      </div>
    </div>
  )
}
