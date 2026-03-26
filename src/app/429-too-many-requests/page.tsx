import { Typography } from '~/components/ui/Typography/Typography'
import { getServerT } from '~/lib/i18n/getServerT'

export default async function TooManyRequests() {
  const { t } = await getServerT()

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black flex-col gap-4">
      <Typography variant="Body/L/Regular">{t('tooManyRequests.title')}</Typography>
      <Typography variant="Body/M/Regular">{t('tooManyRequests.pleaseTryAgainLater')}</Typography>
      <Typography variant="Body/M/Semibold" asTag="a" href="/">
        {t('common.goToHome')}
      </Typography>
    </div>
  )
}
