'use client'

import { HeadphonesIcon } from 'lucide-react'
import { useCallback, useState } from 'react'

import { Button, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { cn } from '~/utils/cn'

export type ArticlePublicListenAudioProps = {
  assetId?: string | null
  className?: string
}

export const ArticlePublicListenAudio = (props: ArticlePublicListenAudioProps) => {
  const { assetId, className } = props
  const t = useT()
  const [open, setOpen] = useState(false)

  const toggle = useCallback(() => {
    setOpen((v) => !v)
  }, [])

  if (!assetId) {
    return null
  }

  const src = `/cdn/${assetId}`

  return (
    <div className={cn('mb-4 flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm-md" className="gap-2" onClick={toggle} aria-expanded={open}>
          <HeadphonesIcon className="size-4 shrink-0" aria-hidden />
          {open ? t('article.ui.listenAudioHidePlayer') : t('article.ui.listenAudioShowPlayer')}
        </Button>
      </div>
      {open ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
          <audio className="w-full max-w-xl" controls preload="metadata" src={src} />
          <Typography className="text-xs text-muted-foreground">{t('article.ui.listenAudioAiDisclosure')}</Typography>
        </div>
      ) : null}
    </div>
  )
}
