'use client'

import { useEffect } from 'react'

import { Button, Typography } from '~/components/ui'
import { trackError } from '~/lib/metrics/tracker'
import { useT } from '~/providers'

/**
 * A rendering error inside the app. Reported to the metrics facade (scrubbed on the server), and
 * the person gets a way back instead of a blank page. `digest` is Next's id of the server-side
 * error — the one line support needs to find it in the server log.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT()

  useEffect(() => {
    trackError(error, window.location.pathname)
  }, [error])

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-6 text-center">
      <Typography variant="heading-2">{t('errorPage.title')}</Typography>
      <Typography variant="Body/M/Regular" className="max-w-md text-muted-foreground">
        {t('errorPage.description')}
      </Typography>
      {error.digest && (
        <Typography variant="Body/XS/Regular" className="font-mono text-muted-foreground">
          {t('errorPage.digest', { digest: error.digest })}
        </Typography>
      )}
      <Button onClick={reset}>{t('errorPage.retry')}</Button>
    </div>
  )
}
