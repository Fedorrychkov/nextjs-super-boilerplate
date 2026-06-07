import Link from 'next/link'

import { getServerT } from '~/lib/i18n/server'

import { LANDING_TECH_IDS } from './landing-i18n'

type Props = {
  githubUrl?: string | null
  demoUrl?: string | null
}

export const Hero = async ({ githubUrl, demoUrl }: Props) => {
  const { t } = await getServerT()

  return (
    <section className="relative overflow-hidden border-b border-border/40">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.06]"
        style={{
          backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20 md:py-32 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground mb-8">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
          {t('nbs.hero.badge')}
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1] max-w-3xl mx-auto">
          {t('nbs.hero.titleBefore')}{' '}
          <span className="relative">
            <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">{t('nbs.hero.titleHighlight')}</span>
          </span>{' '}
          {t('nbs.hero.titleAfter')}
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t('nbs.hero.subtitle')} <code className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono">{t('nbs.hero.subtitleConfigFile')}</code>
          {t('nbs.hero.subtitleAfter')}
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          {githubUrl && (
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background hover:opacity-80 transition-opacity"
            >
              <GitHubIcon />
              {t('nbs.hero.ctaGithub')}
            </a>
          )}
          {demoUrl && (
            <a
              href={demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              {t('nbs.hero.ctaDemo')}
            </a>
          )}
          <Link
            href="/profile"
            className="flex h-11 w-full sm:w-auto items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            {t('nbs.hero.ctaAuth')}
          </Link>
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
          {LANDING_TECH_IDS.map((id) => (
            <span key={id} className="rounded-full border border-border bg-card px-3 py-1 font-mono">
              {t(`nbs.hero.tech.${id}`)}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)
