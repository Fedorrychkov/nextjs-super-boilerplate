'use client'

import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react'

import { Typography } from '~/components/ui'
import type { ThemePreference } from '~/lib/theme/config'
import { useT } from '~/providers'
import { useTheme } from '~/providers/theme'
import { cn } from '~/utils/cn'

const OPTIONS: Array<{ value: ThemePreference; icon: typeof SunIcon; labelKey: 'theme.modeLight' | 'theme.modeDark' | 'theme.modeSystem' }> = [
  { value: 'light', icon: SunIcon, labelKey: 'theme.modeLight' },
  { value: 'dark', icon: MoonIcon, labelKey: 'theme.modeDark' },
  { value: 'system', icon: MonitorIcon, labelKey: 'theme.modeSystem' },
]

type Props = {
  className?: string
}

export function ThemeModeSelect({ className }: Props) {
  const t = useT()
  const { preference, setPreference, hydrated } = useTheme()

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Typography variant="Body/S/Semibold">{t('theme.appearanceHeading')}</Typography>
      <Typography variant="Body/XS/Regular" className="text-muted-foreground">
        {t('theme.appearanceHint')}
      </Typography>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('theme.appearanceHeading')}>
        {OPTIONS.map(({ value, icon: Icon, labelKey }) => {
          const isActive = hydrated && preference === value

          return (
            <button
              key={value}
              type="button"
              onClick={() => setPreference(value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors',
                isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground hover:bg-muted',
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {t(labelKey)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
