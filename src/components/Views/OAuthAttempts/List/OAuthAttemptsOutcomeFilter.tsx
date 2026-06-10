'use client'

import type { OAuthAttemptOutcome } from '~/api/oauth'
import { Badge, Button } from '~/components/ui'
import type { AppMessageKey } from '~/lib/i18n'
import { useT } from '~/providers'
import { cn } from '~/utils/cn'

type Props = {
  value?: OAuthAttemptOutcome | ''
  onChange: (value: OAuthAttemptOutcome | '') => void
  disabled?: boolean
}

const OUTCOME_OPTIONS: Array<{ value: OAuthAttemptOutcome | ''; labelKey: AppMessageKey }> = [
  { value: '', labelKey: 'oauthAttempts.filters.all' },
  { value: 'email_collision', labelKey: 'oauthAttempts.filters.emailCollision' },
  { value: 'provider_taken', labelKey: 'oauthAttempts.filters.providerTaken' },
  { value: 'not_found', labelKey: 'oauthAttempts.filters.notFound' },
  { value: 'error', labelKey: 'oauthAttempts.filters.error' },
  { value: 'success', labelKey: 'oauthAttempts.filters.success' },
]

export function OAuthAttemptsOutcomeFilter({ value = '', onChange, disabled }: Props) {
  const t = useT()

  return (
    <div className="flex flex-wrap gap-2">
      {OUTCOME_OPTIONS.map((option) => (
        <Button
          key={option.value || 'all'}
          type="button"
          size="sm-md"
          variant={value === option.value ? 'default' : 'outline'}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {t(option.labelKey)}
        </Button>
      ))}
    </div>
  )
}

export function OAuthAttemptOutcomeBadge({ outcome }: { outcome: OAuthAttemptOutcome }) {
  const t = useT()

  return (
    <Badge
      className={cn(
        'whitespace-nowrap',
        outcome === 'email_collision' && 'bg-amber-500 text-white',
        outcome === 'provider_taken' && 'bg-orange-500 text-white',
        outcome === 'not_found' && 'bg-slate-500 text-white',
        outcome === 'error' && 'bg-red-500 text-white',
        outcome === 'success' && 'bg-green-600 text-white',
      )}
    >
      {t(`oauthAttempts.outcomes.${outcome}` as AppMessageKey)}
    </Badge>
  )
}
