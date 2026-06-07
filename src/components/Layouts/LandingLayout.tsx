import Link from 'next/link'

import { Logo } from '~/components/ui/Logo'
import { getServerT } from '~/lib/i18n/server'
import { ThemeShell } from '~/providers/theme'
import { cn } from '~/utils/cn'

type Props = {
  children: React.ReactNode
  className?: string
  githubUrl?: string | null
  demoUrl?: string | null
}

/**
 * Full-page landing layout — separate from the app shell / platform layout.
 * Includes its own header with logo, nav and CTAs.
 */
export const LandingLayout = async ({ children, className, githubUrl, demoUrl }: Props) => {
  const { t } = await getServerT()

  return (
    <ThemeShell className={cn('flex min-h-screen flex-col', className)}>
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo size={28} showText />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/articles" className="hover:text-foreground transition-colors">
              {t('nbs.layout.navArticles')}
            </Link>
            <Link href="/ui-kit" className="hover:text-foreground transition-colors">
              {t('nbs.layout.navUiKit')}
            </Link>
            {githubUrl && (
              <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                {t('nbs.layout.navGithub')}
              </a>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="hidden sm:flex h-8 items-center rounded-full px-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('nbs.layout.signIn')}
            </Link>
            {demoUrl ? (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background hover:opacity-80 transition-opacity"
              >
                {t('nbs.layout.liveDemo')}
              </a>
            ) : (
              <Link
                href="/profile"
                className="flex h-8 items-center rounded-full bg-foreground px-4 text-sm font-semibold text-background hover:opacity-80 transition-opacity"
              >
                {t('nbs.layout.getStarted')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex flex-col flex-1 font-sans">{children}</main>
    </ThemeShell>
  )
}
