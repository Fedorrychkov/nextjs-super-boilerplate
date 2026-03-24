'use client'

import { useMemo, useState } from 'react'

import { TitleWithBadge } from '~/components/Blocks/TitleWithBadge'
import { CustomTooltip } from '~/components/Blocks/Tooltip'
import { Select } from '~/components/ui/select-1'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Typography } from '~/components/ui/Typography/Typography'
import { useRumDashboardQuery } from '~/query/rum'

const RUM_METRIC_TOOLTIPS = {
  CLS: {
    description: 'Visual stability: how much visible elements shift unexpectedly during the page lifetime.',
    docsUrl: 'https://web.dev/articles/cls/',
  },
  FCP: {
    description: 'Time from navigation start until any part of the page content is first painted.',
    docsUrl: 'https://web.dev/articles/fcp/',
  },
  INP: {
    description: 'Overall responsiveness: latency of interactions across the full page visit.',
    docsUrl: 'https://web.dev/articles/inp/',
  },
  LCP: {
    description: 'Loading performance: time until the largest image or text block becomes visible.',
    docsUrl: 'https://web.dev/articles/lcp/',
  },
  TTFB: {
    description: 'Time from requesting the document until the first byte of the response arrives.',
    docsUrl: 'https://web.dev/articles/ttfb/',
  },
} as const

type RumMetricTooltipKey = keyof typeof RUM_METRIC_TOOLTIPS

function RumMetricTooltipContent({ metricKey }: { metricKey: RumMetricTooltipKey }) {
  const info = RUM_METRIC_TOOLTIPS[metricKey]

  return (
    <div className="flex flex-col gap-2">
      <Typography variant="Body/XS/Regular" className="text-popover-foreground">
        {info.description}
      </Typography>
      <Typography variant="Body/XS/Regular" asTag="a" href={info.docsUrl} target="_blank" rel="noopener noreferrer">
        Documentation on web.dev →
      </Typography>
    </div>
  )
}

const DAY_OPTIONS = [
  { value: '1', label: '1 day' },
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
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
  const [daysStr, setDaysStr] = useState('7')
  const days = useMemo(() => Number.parseInt(daysStr, 10) || 7, [daysStr])

  const { data, isLoading, isError } = useRumDashboardQuery(days)

  return (
    <div className="flex flex-col gap-6 md:px-8 px-2 py-4 w-full max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <TitleWithBadge title="RUM / Web Vitals" badgeContent={<Typography variant="Body/XS/Regular">{data?.totalSamples ?? '—'}</Typography>} />
        <div className="flex flex-col gap-1 min-w-[180px]">
          <Typography variant="Body/XS/Regular" className="text-muted-foreground">
            Window
          </Typography>
          <Select size="small" value={daysStr} options={DAY_OPTIONS} onChange={(e) => setDaysStr(e.target.value)} />
        </div>
      </div>

      {data && (
        <Typography variant="Body/XS/Regular" className="text-muted-foreground">
          Period: {new Date(data.since).toLocaleString()} — {new Date(data.until).toLocaleString()}
        </Typography>
      )}

      {isError && (
        <Typography variant="Body/S/Regular" className="text-destructive">
          Failed to load data. Check your authorization and try again.
        </Typography>
      )}

      <div className="flex flex-col gap-2">
        <Typography variant="Body/S/Semibold">Metrics</Typography>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
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
                  <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMetricDisplay(row.name, row.avg)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMetricDisplay(row.name, row.p75)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMetricDisplay(row.name, row.min)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMetricDisplay(row.name, row.max)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2">
        <Typography variant="Body/S/Semibold">Top paths</Typography>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pathname</TableHead>
              <TableHead className="text-right">Events</TableHead>
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
                    No data for the selected period
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
