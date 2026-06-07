import { getServerT } from '~/lib/i18n/server'

import { LANDING_FEATURE_IDS } from './landing-i18n'

const FEATURE_ICONS: Record<(typeof LANDING_FEATURE_IDS)[number], string> = {
  auth: '🔐',
  cms: '📝',
  admin: '🛠',
  seo: '🌐',
  push: '🔔',
  ai: '🤖',
  i18n: '🌍',
  deploy: '🚀',
  dx: '🎨',
}

export const Features = async () => {
  const { t } = await getServerT()

  return (
    <section className="border-b border-border/40 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t('nbs.features.title')}</h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{t('nbs.features.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {LANDING_FEATURE_IDS.map((id) => (
            <div key={id} className="group rounded-2xl border border-border bg-card p-5 hover:border-border/80 hover:shadow-sm transition-all">
              <div className="mb-3 text-2xl">{FEATURE_ICONS[id]}</div>
              <h3 className="font-semibold text-foreground text-sm mb-1">{t(`nbs.features.items.${id}.title`)}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{t(`nbs.features.items.${id}.description`)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
