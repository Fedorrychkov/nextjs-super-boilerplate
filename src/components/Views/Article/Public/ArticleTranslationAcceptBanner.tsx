'use client'

import { XIcon } from 'lucide-react'
import { useLayoutEffect, useState } from 'react'

import { Button, Typography } from '~/components/ui'

type Phase = 'show' | 'hide'

const DISMISS_MS = 7 * 24 * 60 * 60 * 1000

function readDismissed(storageKey: string): boolean {
  if (typeof globalThis.localStorage === 'undefined') {
    return false
  }

  try {
    const raw = globalThis.localStorage.getItem(storageKey)

    if (!raw) {
      return false
    }

    const parsed = JSON.parse(raw) as { until?: number }

    return typeof parsed.until === 'number' && Date.now() < parsed.until
  } catch {
    return false
  }
}

type Props = {
  storageKey: string
  suggestedUrl: string
  leadLabel: string
  openButtonLabel: string
  laterLabel: string
  regionAriaLabel: string
}

/**
 * Suggests another published locale from the same translation group when it matches `Accept-Language`.
 * Dismissal is stored in `localStorage` for several days (no redirect).
 */
export function ArticleTranslationAcceptBanner(props: Props) {
  const { storageKey, suggestedUrl, leadLabel, openButtonLabel, laterLabel, regionAriaLabel } = props
  const [phase, setPhase] = useState<Phase>('show')

  useLayoutEffect(() => {
    if (readDismissed(storageKey)) {
      queueMicrotask(() => {
        setPhase('hide')
      })
    }
  }, [storageKey])

  const dismiss = () => {
    try {
      globalThis.localStorage?.setItem(storageKey, JSON.stringify({ until: Date.now() + DISMISS_MS }))
    } catch {
      // ignore
    }

    setPhase('hide')
  }

  if (phase !== 'show') {
    return null
  }

  return (
    <div
      role="region"
      aria-label={regionAriaLabel}
      className="mb-4 flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <Typography className="text-sm text-foreground">{leadLabel}</Typography>
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
        <Button type="button" variant="default" size="sm-md" asChild>
          <a href={suggestedUrl}>{openButtonLabel}</a>
        </Button>
        <Button type="button" variant="ghost" size="sm-md" className="gap-1" onClick={dismiss} aria-label={laterLabel}>
          <XIcon className="size-4" />
          {laterLabel}
        </Button>
      </div>
    </div>
  )
}
