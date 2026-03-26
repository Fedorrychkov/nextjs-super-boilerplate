import { Typography } from '~/components/ui/Typography'
import { getServerT } from '~/lib/i18n/server'
import { time } from '~/utils/time'

type Props = {
  publishedAt?: string | null
  className?: string
}

export async function ArticlePublishedDate({ publishedAt, className }: Props) {
  const { locale } = await getServerT()

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
