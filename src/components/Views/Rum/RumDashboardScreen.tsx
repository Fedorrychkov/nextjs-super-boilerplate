'use client'

import { useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'

import { TitleWithBadge } from '~/components/Blocks/TitleWithBadge'
import { CustomTooltip } from '~/components/Blocks/Tooltip'
import { Select } from '~/components/ui/select-1'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Typography } from '~/components/ui/Typography/Typography'
import type { TFunction } from '~/lib/i18n'
import { useT } from '~/providers'
import { useRumDashboardQuery } from '~/query/rum'

const RUM_METRIC_TOOLTIPS = {
  CLS: {
    description: 'rum.ui.info.cls',
    docsUrl: 'https://web.dev/articles/cls/',
  },
  FCP: {
    description: 'rum.ui.info.fcp',
    docsUrl: 'https://web.dev/articles/fcp/',
  },
  INP: {
    description: 'rum.ui.info.inp',
    docsUrl: 'https://web.dev/articles/inp/',
  },
  LCP: {
    description: 'rum.ui.info.lcp',
    docsUrl: 'https://web.dev/articles/lcp/',
  },
  TTFB: {
    description: 'rum.ui.info.ttfb',
    docsUrl: 'https://web.dev/articles/ttfb/',
  },
} as const

type RumMetricTooltipKey = keyof typeof RUM_METRIC_TOOLTIPS

const RumMetricTooltipContent = ({ metricKey }: { metricKey: RumMetricTooltipKey }) => {
  const info = RUM_METRIC_TOOLTIPS[metricKey]
  const t = useT()

  return (
    <div className="flex flex-col gap-2">
      <Typography variant="Body/XS/Regular" className="text-popover-foreground">
        {t(info.description)}
      </Typography>
      <Typography variant="Body/XS/Regular" asTag="a" href={info.docsUrl} target="_blank" rel="noopener noreferrer">
        {t('rum.ui.documentationOnWebDev')} →
      </Typography>
    </div>
  )
}

const DAY_OPTIONS = (t: TFunction) => [
  { value: '1', label: `1 ${t('rum.ui.days.one')}` },
  { value: '7', label: `7 ${t('rum.ui.days.other')}` },
  { value: '14', label: `14 ${t('rum.ui.days.other')}` },
]

function formatMetricDisplay(name: string, value: number | null): string {
  if (value === null) {
    return '—'
  }

  if (name === 'CLS') {
    return value.toFixed(3)
  }

  return `${Math.round(value)} ms`
}

export const RumDashboardScreen = () => {
  const t = useT()
  const searchParams = useSearchParams()
  const daysSearchParam = searchParams.get('days') || '7'
  const pathnameSearchParam = searchParams.get('pathname')

  const [daysStr, setDaysStr] = useState(daysSearchParam)
  const days = useMemo(() => Number.parseInt(daysStr, 10) || 7, [daysStr])

  const { data, isLoading, isError } = useRumDashboardQuery({ days, pathname: pathnameSearchParam })

  const dayOptions = useMemo(() => DAY_OPTIONS(t), [t])

  return (
    <div className="flex flex-col gap-6 md:px-8 px-2 py-4 w-full max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <TitleWithBadge title={t('navigation.rumDashboard')} badgeContent={<Typography variant="Body/XS/Regular">{data?.totalSamples ?? '—'}</Typography>} />
        <div className="flex flex-col gap-1 min-w-[180px]">
          <Typography variant="Body/XS/Regular" className="text-muted-foreground">
            {t('rum.ui.window')}
          </Typography>
          <Select size="small" value={daysStr} options={dayOptions} onChange={(e) => setDaysStr(e.target.value)} />
        </div>
      </div>

      {data && (
        <Typography variant="Body/XS/Regular" className="text-muted-foreground">
          {t('rum.ui.period')}: {new Date(data.since).toLocaleString()} — {new Date(data.until).toLocaleString()}
        </Typography>
      )}

      {isError && (
        <Typography variant="Body/S/Regular" className="text-destructive">
          {t('rum.errors.failedToLoadData')}
        </Typography>
      )}

      <div className="flex flex-col gap-2">
        <Typography variant="Body/S/Semibold">{t('rum.ui.metrics')}</Typography>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('rum.ui.metric')}</TableHead>
              <TableHead className="text-right">N</TableHead>
              <TableHead className="text-right">avg</TableHead>
              <TableHead className="text-right">p75</TableHead>
              <TableHead className="text-right">min</TableHead>
              <TableHead className="text-right">max</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <div className="h-4 bg-muted/50 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))}
            {!isLoading &&
              data?.byMetric.map((row) => (
                <TableRow key={row.name}>
                  <TableCell className="font-medium">
                    <CustomTooltip enableInfoIcon content={<RumMetricTooltipContent metricKey={row.name as RumMetricTooltipKey} />}>
                      <span className="cursor-help border-b border-dotted border-muted-foreground/50">{row.name}</span>
                    </CustomTooltip>
                  </TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{row.count}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{formatMetricDisplay(row.name, row.avg)}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{formatMetricDisplay(row.name, row.p75)}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{formatMetricDisplay(row.name, row.min)}</TableCell>
                  <TableCell className="text-right tabular-nums whitespace-nowrap">{formatMetricDisplay(row.name, row.max)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2">
        <Typography variant="Body/S/Semibold">{t('rum.ui.topPaths')}</Typography>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('rum.ui.pathname')}</TableHead>
              <TableHead className="text-right">{t('rum.ui.events')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={2}>
                  <div className="h-4 bg-muted/50 rounded animate-pulse" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              (data?.topPathnames.length ? (
                data.topPathnames.map((row) => (
                  <TableRow key={row.pathname}>
                    <TableCell className="max-w-[480px] truncate font-mono text-xs">{row.pathname}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    {t('rum.ui.noDataForSelectedPeriod')}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
