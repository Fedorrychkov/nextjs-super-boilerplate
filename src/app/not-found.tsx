import { Typography } from '~/components/ui'
import { getServerT } from '~/lib/i18n/server'
import { ThemeShell } from '~/providers/theme'

export default async function NotFound() {
  const { t } = await getServerT()

  return (
    <ThemeShell className="flex min-h-screen flex-col items-center justify-center gap-4 font-sans">
      <Typography variant="Body/L/Regular">{t('notFound.title')}</Typography>
      <Typography variant="Body/M/Semibold" asTag="a" href="/">
        {t('common.goToHome')}
      </Typography>
    </ThemeShell>
  )
}
