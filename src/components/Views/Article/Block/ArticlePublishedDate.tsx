import { Typography } from '~/components/ui/Typography'
import { time } from '~/utils/time'

type Props = {
  publishedAt?: string | null
  className?: string
}

export function ArticlePublishedDate({ publishedAt, className }: Props) {
  if (!publishedAt || !time(publishedAt)?.isValid()) {
    return null
  }

  const d = new Date(publishedAt)

  return (
    <Typography variant="Body/XS/Regular" className={className}>
      {d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}{' '}
      {d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
    </Typography>
  )
}
