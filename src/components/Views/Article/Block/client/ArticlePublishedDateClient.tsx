'use client'

import { Typography } from '~/components/ui/Typography'
import { useLocale } from '~/providers/i18n'
import { time } from '~/utils/time'

type Props = {
  publishedAt?: string | null
  className?: string
}

export function ArticlePublishedDateClient({ publishedAt, className }: Props) {
  const locale = useLocale()

  if (!publishedAt || !time(publishedAt)?.isValid()) {
    return null
  }

  const d = new Date(publishedAt)

  return (
    <Typography variant="Body/XS/Regular" className={className}>
      {d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })} {d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
    </Typography>
  )
}
