'use client'

import { EyeIcon, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Button } from '~/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Typography } from '~/components/ui/Typography/Typography'
import { useT } from '~/providers'
import { useAiReferralPathnameQueryStats, useAiReferralPathnameVisitsInfinite } from '~/query/ai-referrals'
import { parseReferrerQueryParams } from '~/utils/parseReferrerQueryParams'

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

type DetailTab = 'referrers' | 'params'

type Props = {
  pathname: string
  days: number
  enabled: boolean
}

function sortParamPairs(pairs: ReturnType<typeof parseReferrerQueryParams>) {
  return [...pairs].sort((a, b) => {
    const aU = a.key.startsWith('utm_') ? 0 : 1
    const bU = b.key.startsWith('utm_') ? 0 : 1

    if (aU !== bU) {
      return aU - bU
    }

    return a.key.localeCompare(b.key)
  })
}

export const AiReferralPathnameDetailPanel = ({ pathname, days, enabled }: Props) => {
  const t = useT()
  const [tab, setTab] = useState<DetailTab>('referrers')

  const visitsQuery = useAiReferralPathnameVisitsInfinite(pathname, days, enabled && tab === 'referrers')
  const statsQuery = useAiReferralPathnameQueryStats(pathname, days, enabled && tab === 'params')

  const flatVisits = useMemo(() => visitsQuery.data?.pages.flatMap((p) => p.items) ?? [], [visitsQuery.data?.pages])

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={tab === 'referrers' ? 'default' : 'secondary'} onClick={() => setTab('referrers')}>
          {t('aiReferrals.ui.detail.tabReferrers')}
        </Button>
        <Button type="button" size="sm" variant={tab === 'params' ? 'default' : 'secondary'} onClick={() => setTab('params')}>
          {t('aiReferrals.ui.detail.tabParams')}
        </Button>
      </div>

      {tab === 'referrers' && (
        <div className="max-h-80 overflow-y-auto flex flex-col gap-2">
          {visitsQuery.isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <Typography variant="Body/XS/Regular">{t('aiReferrals.ui.detail.loading')}</Typography>
            </div>
          )}
          {visitsQuery.isError && (
            <Typography variant="Body/XS/Regular" className="text-destructive">
              {t('aiReferrals.errors.failedToLoadDetail')}
            </Typography>
          )}
          {!visitsQuery.isLoading && !flatVisits.length && (
            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
              {t('aiReferrals.ui.detail.noReferrers')}
            </Typography>
          )}
          {flatVisits.map((row) => {
            const pairs = sortParamPairs(parseReferrerQueryParams(row.referrer))

            return (
              <div key={row.id} className="rounded border border-border/60 bg-background/80 p-2 text-xs">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-muted-foreground">
                  <Typography asTag="span" className="tabular-nums">
                    {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                  </Typography>
                  <Typography asTag="span" className="font-medium text-foreground">
                    {row.source}
                  </Typography>
                  <Typography asTag="span">{row.referrerHost}</Typography>
                </div>
                <Typography variant="Body/XS/Regular" className="mt-1 font-mono break-all text-[11px] leading-snug">
                  {row.referrer}
                </Typography>
                {pairs.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pairs.map(({ key, value }, idx) => (
                      <Typography asTag="span" key={`${row.id}-p-${idx}`} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                        {key}=
                        <Typography asTag="span" className="text-foreground">
                          {safeDecodeURIComponent(value)}
                        </Typography>
                      </Typography>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {visitsQuery.hasNextPage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="self-start"
              disabled={visitsQuery.isFetchingNextPage}
              onClick={() => visitsQuery.fetchNextPage()}
            >
              {visitsQuery.isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  {t('aiReferrals.ui.detail.loading')}
                </>
              ) : (
                t('aiReferrals.ui.detail.loadMore')
              )}
            </Button>
          )}
        </div>
      )}

      {tab === 'params' && (
        <div className="max-h-96 overflow-y-auto">
          {statsQuery.isLoading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <Typography variant="Body/XS/Regular">{t('aiReferrals.ui.detail.aggregating')}</Typography>
            </div>
          )}
          {statsQuery.isError && (
            <Typography variant="Body/XS/Regular" className="text-destructive">
              {t('aiReferrals.errors.failedToLoadDetail')}
            </Typography>
          )}
          {!statsQuery.isLoading && statsQuery.data && !statsQuery.data.keys.length && (
            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
              {t('aiReferrals.ui.detail.noParams')}
            </Typography>
          )}
          {statsQuery.data && statsQuery.data.keys.length > 0 && (
            <div className="flex flex-col gap-4">
              {statsQuery.data.keys.map((k) => (
                <div key={k.key} className="rounded border border-border/60 bg-background/80 p-2">
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <Typography variant="Body/S/Semibold" className="font-mono text-sm">
                      {k.key}
                    </Typography>
                    <Typography variant="Body/XS/Regular" className="text-muted-foreground tabular-nums">
                      {t('aiReferrals.ui.detail.visitsWithParam')}: {k.visitCount}
                    </Typography>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('aiReferrals.ui.detail.value')}</TableHead>
                        <TableHead className="text-right">{t('aiReferrals.ui.events')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {k.values.map((v) => (
                        <TableRow key={`${k.key}-${v.value}`}>
                          <TableCell className="max-w-[320px] break-all font-mono text-xs">{safeDecodeURIComponent(v.value)}</TableCell>
                          <TableCell className="text-right tabular-nums text-xs">{v.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

type ToggleProps = {
  pathname: string
  expanded: boolean
  onToggle: () => void
}

export const AiReferralPathnameDetailToggle = ({ expanded, onToggle }: ToggleProps) => {
  const t = useT()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-8 w-8 shrink-0 p-0"
      aria-expanded={expanded}
      aria-label={t('aiReferrals.ui.detail.toggleAria')}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
    >
      <EyeIcon className={`h-4 w-4 ${expanded ? 'opacity-100' : 'opacity-70'}`} />
    </Button>
  )
}
