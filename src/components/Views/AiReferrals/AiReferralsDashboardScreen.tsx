'use client'

import { useSearchParams } from 'next/navigation'
import { Fragment, useMemo, useState } from 'react'

import { TitleWithBadge } from '~/components/Blocks/TitleWithBadge'
import { Select } from '~/components/ui/select-1'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Typography } from '~/components/ui/Typography/Typography'
import { AiReferralPathnameDetailPanel, AiReferralPathnameDetailToggle } from '~/components/Views/AiReferrals/AiReferralPathnameDetailPanel'
import type { TFunction } from '~/lib/i18n'
import { useT } from '~/providers'
import { useAiReferralsDashboardQuery } from '~/query/ai-referrals'

const DAY_OPTIONS = (t: TFunction) => [
  { value: '1', label: `1 ${t('aiReferrals.ui.days.one')}` },
  { value: '7', label: `7 ${t('aiReferrals.ui.days.other')}` },
  { value: '30', label: `30 ${t('aiReferrals.ui.days.other')}` },
]

export const AiReferralsDashboardScreen = () => {
  const t = useT()
  const searchParams = useSearchParams()
  const daysSearchParam = searchParams.get('days') || '7'
  const pathnameSearchParam = searchParams.get('pathname')

  const [daysStr, setDaysStr] = useState(daysSearchParam)
  const days = useMemo(() => Number.parseInt(daysStr, 10) || 7, [daysStr])
  const dayOptions = useMemo(() => DAY_OPTIONS(t), [t])
  const { data, isLoading, isError } = useAiReferralsDashboardQuery({ days, pathname: pathnameSearchParam })
  const [expandedPathname, setExpandedPathname] = useState<string | null>(null)

  const togglePathnameDetail = (pathname: string) => {
    setExpandedPathname((prev) => (prev === pathname ? null : pathname))
  }

  return (
    <div className="flex flex-col gap-6 md:px-8 px-2 py-4 w-full max-w-full mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <TitleWithBadge title={t('aiReferrals.ui.title')} badgeContent={<Typography variant="Body/XS/Regular">{data?.totalSamples ?? '—'}</Typography>} />
        <div className="flex flex-col gap-1 min-w-[180px]">
          <Typography variant="Body/XS/Regular" className="text-muted-foreground">
            {t('aiReferrals.ui.window')}
          </Typography>
          <Select size="small" value={daysStr} options={dayOptions} onChange={(e) => setDaysStr(e.target.value)} />
        </div>
      </div>

      {data && (
        <Typography variant="Body/XS/Regular" className="text-muted-foreground">
          {t('aiReferrals.ui.period')}: {new Date(data.since).toLocaleString()} — {new Date(data.until).toLocaleString()}
        </Typography>
      )}

      {isError && (
        <Typography variant="Body/S/Regular" className="text-destructive">
          {t('aiReferrals.errors.failedToLoadData')}
        </Typography>
      )}

      <div className="flex flex-col gap-2">
        <Typography variant="Body/S/Semibold">{t('aiReferrals.ui.bySource')}</Typography>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('aiReferrals.ui.source')}</TableHead>
              <TableHead className="text-right">{t('aiReferrals.ui.events')}</TableHead>
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
              (data?.bySource.length ? (
                data.bySource.map((row) => (
                  <TableRow key={row.source}>
                    <TableCell className="font-medium">{row.source}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    {t('aiReferrals.ui.noDataForSelectedPeriod')}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2">
        <Typography variant="Body/S/Semibold">{t('aiReferrals.ui.topPaths')}</Typography>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>{t('aiReferrals.ui.pathname')}</TableHead>
              <TableHead className="text-right">{t('aiReferrals.ui.events')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3}>
                  <div className="h-4 bg-muted/50 rounded animate-pulse" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              (data?.topPathnames.length ? (
                data.topPathnames.map((row) => (
                  <Fragment key={row.pathname}>
                    <TableRow>
                      <TableCell className="align-middle">
                        <AiReferralPathnameDetailToggle
                          pathname={row.pathname}
                          expanded={expandedPathname === row.pathname}
                          onToggle={() => togglePathnameDetail(row.pathname)}
                        />
                      </TableCell>
                      <TableCell className="max-w-[min(480px,55vw)] truncate font-mono text-xs">{row.pathname}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                    </TableRow>
                    {expandedPathname === row.pathname && (
                      <TableRow>
                        <TableCell colSpan={3} className="bg-muted/10">
                          <AiReferralPathnameDetailPanel pathname={row.pathname} days={days} enabled />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    {t('aiReferrals.ui.noDataForSelectedPeriod')}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
