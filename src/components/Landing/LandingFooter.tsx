import Link from 'next/link'

import { Typography } from '~/components/ui'
import { Logo } from '~/components/ui/Logo'
import { getServerT } from '~/lib/i18n/server'

type Props = {
  githubUrl?: string | null
  demoUrl?: string | null
  authorName?: string
  authorUrl?: string
}

export const LandingFooter = async ({ githubUrl, demoUrl, authorName, authorUrl }: Props) => {
  const { t } = await getServerT()

  return (
    <footer className="border-t border-border/40 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center sm:items-start gap-2">
            <Logo size={24} showText />
            <Typography className="text-xs text-muted-foreground">{t('nbs.footer.tagline')}</Typography>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/articles" className="hover:text-foreground transition-colors">
              {t('nbs.footer.navArticles')}
            </Link>
            <Link href="/ui-kit" className="hover:text-foreground transition-colors">
              {t('nbs.footer.navUiKit')}
            </Link>
            <Link href="/profile" className="hover:text-foreground transition-colors">
              {t('nbs.footer.navDashboard')}
            </Link>
            {githubUrl && (
              <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                {t('nbs.footer.navGithub')}
              </a>
            )}
            {demoUrl && (
              <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                {t('nbs.footer.navDemo')}
              </a>
            )}
          </nav>
        </div>

        <div className="mt-8 border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <Typography>
            {t('nbs.footer.builtBy')}{' '}
            {authorUrl ? (
              <a href={authorUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline underline-offset-2">
                {authorName ?? t('nbs.footer.authorFallback')}
              </a>
            ) : (
              <Typography asTag="span">{authorName ?? t('nbs.footer.authorFallback')}</Typography>
            )}
          </Typography>
          <Typography>{t('nbs.footer.bottomLine')}</Typography>
        </div>
      </div>
    </footer>
  )
}
