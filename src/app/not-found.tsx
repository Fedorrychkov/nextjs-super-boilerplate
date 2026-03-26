import { Typography } from '~/components/ui'
import { getServerT } from '~/lib/i18n/server'

export default async function NotFound() {
  const { t } = await getServerT()

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black flex-col gap-4">
      <Typography variant="Body/L/Regular">{t('notFound.title')}</Typography>
      <Typography variant="Body/M/Semibold" asTag="a" href="/">
        {t('common.goToHome')}
      </Typography>
    </div>
  )
}
