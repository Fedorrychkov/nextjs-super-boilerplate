'use client'

import { useMemo, useState } from 'react'

import { TitleWithBadge } from '~/components/Blocks/TitleWithBadge'
import { Select } from '~/components/ui/select-1'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Typography } from '~/components/ui/Typography/Typography'
import type { TFunction } from '~/lib/i18n'
import { useT } from '~/providers'
import { useLlmUsageDashboardQuery } from '~/query/llm'

const DAY_OPTIONS = (t: TFunction) => [
  { value: '7', label: `7 ${t('llmUsage.ui.days')}` },
  { value: '14', label: `14 ${t('llmUsage.ui.days')}` },
  { value: '30', label: `30 ${t('llmUsage.ui.days')}` },
  { value: '90', label: `90 ${t('llmUsage.ui.days')}` },
]

export const LlmUsageDashboardScreen = () => {
  const t = useT()
  const [daysStr, setDaysStr] = useState('7')
  const days = useMemo(() => Number.parseInt(daysStr, 10) || 7, [daysStr])

  const { data, isLoading, isError } = useLlmUsageDashboardQuery({ days }, true)

  const dayOptions = useMemo(() => DAY_OPTIONS(t), [t])

  return (
    <div className="mx-auto flex w-full max-w-full flex-col gap-6 px-2 py-4 md:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TitleWithBadge
          title={t('navigation.llmUsageDashboard')}
          badgeContent={<Typography variant="Body/XS/Regular">{data?.totals.eventCount ?? '—'}</Typography>}
        />
        <div className="flex min-w-[180px] flex-col gap-1">
          <Typography variant="Body/XS/Regular" className="text-muted-foreground">
            {t('llmUsage.ui.window')}
          </Typography>
          <Select size="small" value={daysStr} options={dayOptions} onChange={(e) => setDaysStr(e.target.value)} />
        </div>
      </div>

      {data && (
        <Typography variant="Body/XS/Regular" className="text-muted-foreground">
          {t('llmUsage.ui.period')}: {new Date(data.since).toLocaleString()} — {new Date(data.until).toLocaleString()}
        </Typography>
      )}

      {isLoading && (
        <Typography variant="Body/S/Regular" className="text-muted-foreground">
          {t('llmUsage.ui.loading')}
        </Typography>
      )}

      {isError && (
        <Typography variant="Body/S/Regular" className="text-destructive">
          {t('llmUsage.errors.loadFailed')}
        </Typography>
      )}

      {data && (
        <>
          <div className="flex flex-col gap-2">
            <Typography variant="Body/S/Semibold">{t('llmUsage.ui.totals')}</Typography>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('llmUsage.ui.metric')}</TableHead>
                  <TableHead className="text-right">{t('llmUsage.ui.value')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{t('llmUsage.ui.totalTokens')}</TableCell>
                  <TableCell className="text-right tabular-nums">{data.totals.totalTokens.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('llmUsage.ui.promptTokens')}</TableCell>
                  <TableCell className="text-right tabular-nums">{data.totals.totalPromptTokens.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('llmUsage.ui.completionTokens')}</TableCell>
                  <TableCell className="text-right tabular-nums">{data.totals.totalCompletionTokens.toLocaleString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t('llmUsage.ui.events')}</TableCell>
                  <TableCell className="text-right tabular-nums">{data.totals.eventCount.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2">
            <Typography variant="Body/S/Semibold">{t('llmUsage.ui.bySource')}</Typography>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('llmUsage.ui.source')}</TableHead>
                  <TableHead className="text-right">{t('llmUsage.ui.events')}</TableHead>
                  <TableHead className="text-right">{t('llmUsage.ui.totalTokens')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bySource.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="Body/S/Regular" className="text-muted-foreground">
                        {t('llmUsage.ui.empty')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.bySource.map((row) => (
                    <TableRow key={row.source}>
                      <TableCell>{t(`llmUsage.source.${row.source}` as const)}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.totalTokens.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2">
            <Typography variant="Body/S/Semibold">{t('llmUsage.ui.topUsers')}</Typography>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>userId</TableHead>
                  <TableHead className="text-right">{t('llmUsage.ui.events')}</TableHead>
                  <TableHead className="text-right">{t('llmUsage.ui.totalTokens')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="Body/S/Regular" className="text-muted-foreground">
                        {t('llmUsage.ui.empty')}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.topUsers.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell className="max-w-[280px] truncate font-mono text-xs">{row.userId}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.eventCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.totalTokens.toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-2">
            <Typography variant="Body/S/Semibold">{t('llmUsage.ui.recent')}</Typography>
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('llmUsage.ui.time')}</TableHead>
                    <TableHead>{t('llmUsage.ui.source')}</TableHead>
                    <TableHead>userId</TableHead>
                    <TableHead>{t('llmUsage.ui.model')}</TableHead>
                    <TableHead className="text-right">{t('llmUsage.ui.totalTokens')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recent.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant="Body/S/Regular" className="text-muted-foreground">
                          {t('llmUsage.ui.empty')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recent.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-xs">{new Date(row.createdAt).toLocaleString()}</TableCell>
                        <TableCell>{t(`llmUsage.source.${row.source}` as const)}</TableCell>
                        <TableCell className="max-w-[120px] truncate font-mono text-xs">{row.userId}</TableCell>
                        <TableCell className="max-w-[140px] truncate text-xs">{row.llmModel}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.totalTokens.toLocaleString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
