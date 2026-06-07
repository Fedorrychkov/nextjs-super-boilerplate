'use client'

import { ACCOUNT_CONFIG } from '@config/env'

import { AlertBlock, Typography } from '~/components/ui'
import { useT } from '~/providers'

function isIosSafariNotStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  const ua = window.navigator.userAgent
  const isIos = /iPhone|iPad|iPod/i.test(ua)
  const isStandalone = 'standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  const isDisplayModeStandalone = window.matchMedia('(display-mode: standalone)').matches

  return isIos && !isStandalone && !isDisplayModeStandalone
}

export const IosPwaHint = () => {
  const t = useT()

  if (!ACCOUNT_CONFIG.publicPushIosPwaHintEnabled || !isIosSafariNotStandalone()) {
    return null
  }

  return (
    <AlertBlock
      notify={{
        type: 'info',
        message: (
          <div className="flex flex-col gap-2">
            <Typography variant="Body/S/Semibold">{t('push.iosPwaHint.title')}</Typography>
            <Typography variant="Body/S/Regular">{t('push.iosPwaHint.description')}</Typography>
          </div>
        ),
      }}
    />
  )
}
