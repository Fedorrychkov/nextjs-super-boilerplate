'use client'

import { useEffect } from 'react'

import { Typography } from '~/components/ui/Typography/Typography'
import { flush, trackError } from '~/lib/metrics/tracker'

/**
 * The root layout itself failed: no providers, no i18n, no styles from the layout. Self-contained
 * markup in both languages, the error reported and sent at once (the page may be closed next).
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    trackError(error, window.location.pathname)
    flush(true)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', display: 'grid', placeItems: 'center', minHeight: '100vh', textAlign: 'center' }}>
        <main style={{ padding: 24, maxWidth: 420 }}>
          <Typography asTag="h1" variant="heading-2">
            Something went wrong · Что-то пошло не так
          </Typography>
          <Typography variant="Body/M/Regular">The page could not load. Try again; if it repeats, send us the code below.</Typography>
          {error.digest && (
            <Typography variant="Body/XS/Regular" className="font-mono">
              {error.digest}
            </Typography>
          )}
          <button type="button" onClick={reset} style={{ padding: '8px 16px', cursor: 'pointer' }}>
            Try again · Повторить
          </button>
        </main>
      </body>
    </html>
  )
}
