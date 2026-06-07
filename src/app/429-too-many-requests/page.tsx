import { Typography } from '~/components/ui/Typography/Typography'
import { getServerT } from '~/lib/i18n/getServerT'
import { ThemeShell } from '~/providers/theme'

export default async function TooManyRequests() {
  const { t } = await getServerT()

  return (
    <ThemeShell className="flex min-h-screen flex-col items-center justify-center gap-4 font-sans">
      <Typography variant="Body/L/Regular">{t('tooManyRequests.title')}</Typography>
      <Typography variant="Body/M/Regular">{t('tooManyRequests.pleaseTryAgainLater')}</Typography>
      <Typography variant="Body/M/Semibold" asTag="a" href="/">
        {t('common.goToHome')}
      </Typography>
    </ThemeShell>
  )
}
