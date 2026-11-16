'use client'

import type { AdminOverview, OverviewAlert } from '@lib/services/admin-overview-rules'
import { AlertTriangleIcon, ArrowRightIcon, CheckCircle2Icon, RefreshCwIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

import { Button, EmptyState, PageShell, Typography } from '~/components/ui'
import { routes } from '~/constants'
import { useT } from '~/providers'
import { cn } from '~/utils/cn'
import { time } from '~/utils/time'

type Tone = 'good' | 'warn' | 'bad' | 'neutral'

const TONE_DOT: Record<Tone, string> = {
  good: 'bg-status-up',
  warn: 'bg-status-slow',
  bad: 'bg-status-down',
  neutral: 'bg-muted-foreground/50',
}

const probeTone = (state: string): Tone => {
  if (state === 'ok') return 'good'

  if (state === 'fail' || state === 'stale') return 'bad'

  if (state === 'unknown') return 'warn'

  return 'neutral'
}

/** Where the owner goes to act on each alert. */
const ALERT_LINK: Partial<Record<OverviewAlert, string>> = {
  scheduledWithoutWorker: routes.articles.path,
  overdueScheduled: routes.articles.path,
  metricsOff: routes.adminPlatformSettings.path,
}

function HealthTile({ label, value, tone, href }: { label: string; value: string; tone: Tone; href?: string }) {
  const body = (
    <div className={cn('flex h-full flex-col gap-1 rounded-xl border border-border bg-card p-4', href && 'transition-colors hover:bg-muted')}>
      <Typography variant="Body/XS/Regular" className="text-muted-foreground">
        {label}
      </Typography>
      <div className="flex items-center gap-2">
        <div aria-hidden className={cn('size-2 shrink-0 rounded-full', TONE_DOT[tone])} />
        <Typography variant="Body/M/Semibold">{value}</Typography>
      </div>
    </div>
  )

  return href ? <Link href={href}>{body}</Link> : body
}

function CountGroup({ title, href, items }: { title: string; href: string; items: { label: string; value: number | undefined }[] }) {
  return (
    <Link href={href} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted">
      <Typography variant="Body/S/Semibold">{title}</Typography>
      <dl className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div key={item.label} className="flex flex-col">
            <Typography asTag="span" variant="Body/XS/Regular" className="text-muted-foreground">
              {item.label}
            </Typography>
            <Typography asTag="span" variant="heading-3">
              {item.value ?? '—'}
            </Typography>
          </div>
        ))}
      </dl>
    </Link>
  )
}

export const AdminOverviewScreen = ({ overview, alerts }: { overview: AdminOverview; alerts: OverviewAlert[] }) => {
  const t = useT()
  const router = useRouter()
  const [isRefreshing, startRefresh] = useTransition()

  const stateLabel = (state: string) => t(`adminOverview.state.${state as 'ok'}`)

  return (
    <PageShell
      title={t('adminOverview.title')}
      description={t('adminOverview.subtitle')}
      actions={
        <>
          <Typography variant="Body/XS/Regular" className="text-muted-foreground">
            {t('adminOverview.generatedAt', { time: time(overview.generatedAt).format('HH:mm:ss') })}
          </Typography>
          <Button variant="outline" size="sm" disabled={isRefreshing} onClick={() => startRefresh(() => router.refresh())}>
            <RefreshCwIcon width={14} height={14} className={cn(isRefreshing && 'animate-spin')} />
            {t('adminOverview.refresh')}
          </Button>
        </>
      }
    >
      <section className="flex flex-col gap-3" aria-labelledby="overview-attention">
        <Typography id="overview-attention" variant="Body/S/Semibold" asTag="h2">
          {t('adminOverview.attentionTitle')}
        </Typography>
        {alerts.length === 0 ? (
          <EmptyState
            className="py-6"
            icon={<CheckCircle2Icon width={20} height={20} className="text-status-up" />}
            title={t('adminOverview.allGood')}
            description={t('adminOverview.allGoodHint')}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {alerts.map((alert) => {
              const href = ALERT_LINK[alert]
              const serious = alert === 'dbDown' || alert === 'redisDown' || alert === 'overdueScheduled'

              return (
                <li
                  key={alert}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border p-3',
                    serious ? 'border-status-down/40 bg-status-down-subtle' : 'border-status-slow/40 bg-status-slow-subtle',
                  )}
                >
                  <AlertTriangleIcon width={16} height={16} className={cn('mt-0.5 shrink-0', serious ? 'text-status-down' : 'text-status-slow')} />
                  <Typography variant="Body/S/Regular" className="flex-1">
                    {t(`adminOverview.alerts.${alert}`)}
                  </Typography>
                  {href && (
                    <Link href={href} aria-label={t('adminOverview.open')} className="shrink-0 rounded-md p-0.5 hover:bg-muted">
                      <ArrowRightIcon width={16} height={16} />
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="overview-health">
        <Typography id="overview-health" variant="Body/S/Semibold" asTag="h2">
          {t('adminOverview.healthTitle')}
        </Typography>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <HealthTile label={t('adminOverview.db')} value={stateLabel(overview.db)} tone={probeTone(overview.db)} />
          <HealthTile label={t('adminOverview.redis')} value={stateLabel(overview.redis)} tone={probeTone(overview.redis)} />
          <HealthTile label={t('adminOverview.worker')} value={stateLabel(overview.worker)} tone={probeTone(overview.worker)} />
          <HealthTile
            label={t('adminOverview.metricsSink')}
            value={overview.metricsSink}
            tone={overview.metricsSink === 'off' ? 'warn' : overview.metricsSink === 'unknown' ? 'neutral' : 'good'}
            href={routes.adminMetrics.path}
          />
        </div>
      </section>

      {overview.users && overview.articles ? (
        <div className="grid gap-3 md:grid-cols-2">
          <CountGroup
            title={t('adminOverview.usersTitle')}
            href={routes.users.path}
            items={[
              { label: t('adminOverview.usersTotal'), value: overview.users.total },
              { label: t('adminOverview.usersLast7Days'), value: overview.users.last7Days },
              { label: t('adminOverview.usersBlocked'), value: overview.users.blocked },
            ]}
          />
          <CountGroup
            title={t('adminOverview.articlesTitle')}
            href={routes.articles.path}
            items={[
              { label: t('adminOverview.articlesPublished'), value: overview.articles.published },
              { label: t('adminOverview.articlesDrafts'), value: overview.articles.drafts },
              { label: t('adminOverview.articlesScheduled'), value: overview.articles.scheduled },
            ]}
          />
        </div>
      ) : (
        <EmptyState title={t('adminOverview.noData')} />
      )}
    </PageShell>
  )
}
