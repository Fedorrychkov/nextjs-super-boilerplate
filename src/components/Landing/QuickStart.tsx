import { Typography } from '~/components/ui'
import { getServerT } from '~/lib/i18n/server'

import { LANDING_QUICK_START_STEPS } from './landing-i18n'

type Props = {
  githubUrl?: string | null
}

const STEP_NUMBERS = ['01', '02', '03', '04'] as const

export const QuickStart = async ({ githubUrl }: Props) => {
  const { t } = await getServerT()

  const codes: Record<(typeof LANDING_QUICK_START_STEPS)[number], string> = {
    fork: githubUrl ? `git clone ${githubUrl}` : 'git clone <your-repo-url>',
    product: t('nbs.quickStart.code.product'),
    env: t('nbs.quickStart.code.env'),
    run: t('nbs.quickStart.code.run'),
  }

  return (
    <section className="border-b border-border/40 bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <Typography asTag="h2" variant="heading-2" className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            {t('nbs.quickStart.title')}
          </Typography>
          <Typography className="mt-3 text-muted-foreground">{t('nbs.quickStart.subtitle')}</Typography>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LANDING_QUICK_START_STEPS.map((stepId, index) => (
            <div key={stepId} className="rounded-2xl border border-border bg-card p-5">
              <Typography className="text-xs font-mono text-muted-foreground mb-2">
                {t('nbs.quickStart.stepLabel')} {STEP_NUMBERS[index]}
              </Typography>
              <Typography className="font-semibold text-foreground text-sm mb-3">{t(`nbs.quickStart.steps.${stepId}.title`)}</Typography>
              <code className="block rounded-lg bg-muted px-3 py-2 text-xs font-mono text-foreground break-all">{codes[stepId]}</code>
            </div>
          ))}
        </div>

        <Typography className="mt-8 text-center text-xs text-muted-foreground">
          {t('nbs.quickStart.footnoteBefore')}{' '}
          <Typography asTag="span" className="font-mono text-foreground">
            {t('nbs.quickStart.footnoteFile')}
          </Typography>{' '}
          {t('nbs.quickStart.footnoteAfter')}
        </Typography>
      </div>
    </section>
  )
}
