'use client'

import { Request } from '@lib/request'
import { BarChart3Icon } from 'lucide-react'
import Link from 'next/link'
import { useQuery } from 'react-query'

import { EmptyState, PageShell, Typography } from '~/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { routes } from '~/constants'
import { useT } from '~/providers'
import { time } from '~/utils/time'

type Summary = {
  sink: string
  available: boolean
  days: string[]
  events: { name: string; total: number; perDay: number[] }[]
  errors: { type: string; message: string; route: string | null; side: string; count: number; lastAt: string }[]
}

const useMetricsSummary = () =>
  useQuery(['admin', 'metrics', 'summary'], async () => (await new Request().apiClient.get<Summary>('/api/v1/admin/metrics/summary')).data, {
    staleTime: 30_000,
  })

/** One row of 14 bars scaled to the row's maximum — enough to see a trend without a charts library. */
function DayBars({ perDay, days }: { perDay: number[]; days: string[] }) {
  const max = Math.max(1, ...perDay)

  return (
    <div className="flex h-8 items-end gap-0.5" aria-hidden>
      {perDay.map((count, index) => (
        <div
          key={days[index]}
          title={`${days[index]}: ${count}`}
          className="w-2 rounded-sm bg-primary/70"
          style={{ height: `${Math.max(4, (count / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

export const MetricsScreen = () => {
  const t = useT()
  const { data, isLoading, isError } = useMetricsSummary()

  return (
    <PageShell title={t('metricsAdmin.title')} description={t('metricsAdmin.subtitle', { sink: data?.sink ?? '…' })}>
      {isLoading && <Typography variant="Body/S/Regular">{t('metricsAdmin.loading')}</Typography>}
      {isError && (
        <Typography variant="Body/S/Regular" className="text-destructive">
          {t('errors.unknown')}
        </Typography>
      )}

      {data && !data.available && (
        <EmptyState
          icon={<BarChart3Icon width={20} height={20} />}
          title={t('metricsAdmin.unavailable', { sink: data.sink })}
          action={
            <Link className="text-sm font-medium underline underline-offset-2" href={routes.adminPlatformSettings.path}>
              {t('metricsAdmin.openSettings')}
            </Link>
          }
        />
      )}

      {data?.available && (
        <>
          <section className="flex flex-col gap-3">
            <Typography variant="heading-3">{t('metricsAdmin.eventsTitle')}</Typography>
            {data.events.length === 0 ? (
              <Typography variant="Body/S/Regular" className="text-muted-foreground">
                {t('metricsAdmin.noEvents')}
              </Typography>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('metricsAdmin.event')}</TableHead>
                    <TableHead>{t('metricsAdmin.total')}</TableHead>
                    <TableHead>{t('metricsAdmin.perDay')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.events.map((event) => (
                    <TableRow key={event.name}>
                      <TableCell className="font-mono text-sm">{event.name}</TableCell>
                      <TableCell>{event.total}</TableCell>
                      <TableCell>
                        <DayBars perDay={event.perDay} days={data.days} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <Typography variant="heading-3">{t('metricsAdmin.errorsTitle')}</Typography>
            {data.errors.length === 0 ? (
              <Typography variant="Body/S/Regular" className="text-muted-foreground">
                {t('metricsAdmin.noErrors')}
              </Typography>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('metricsAdmin.error')}</TableHead>
                    <TableHead>{t('metricsAdmin.where')}</TableHead>
                    <TableHead>{t('metricsAdmin.count')}</TableHead>
                    <TableHead>{t('metricsAdmin.lastAt')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.errors.map((error) => (
                    <TableRow key={`${error.type}:${error.message}:${error.route}:${error.side}`}>
                      <TableCell className="max-w-md">
                        <Typography variant="Body/S/Semibold">{error.type}</Typography>
                        <Typography variant="Body/XS/Regular" className="break-words text-muted-foreground">
                          {error.message}
                        </Typography>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {error.side} · {error.route ?? '—'}
                      </TableCell>
                      <TableCell>{error.count}</TableCell>
                      <TableCell>{time(error.lastAt).format('DD.MM HH:mm')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </section>
        </>
      )}
    </PageShell>
  )
}
