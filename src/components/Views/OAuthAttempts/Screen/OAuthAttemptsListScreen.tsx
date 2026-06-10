'use client'

import { lazy, Suspense, useRef, useState } from 'react'

import type { OAuthAttemptOutcome } from '~/api/oauth'
import { TitleWithBadge } from '~/components/Blocks/TitleWithBadge'
import { StickyContainer } from '~/components/Containers'
import { PaginationSkeleton } from '~/components/List'
import { usePagination } from '~/components/List/usePagination'
import { Typography } from '~/components/ui'
import { useStickyContainer } from '~/hooks/useStickyContainer'
import { useT } from '~/providers'
import { useOAuthAttemptsQuery } from '~/query/oauth'

import { OAuthAttemptsOutcomeFilter } from '../List/OAuthAttemptsOutcomeFilter'
import { OAuthAttemptsTable } from '../List/OAuthAttemptsTable'

const PaginationLazy = lazy(() => import('~/components/List').then((mod) => ({ default: mod.Pagination })))

type Props = {
  forcedUserId?: string
  titleKey?: 'oauthAttempts.title' | 'oauthAttempts.userTitle'
}

export const OAuthAttemptsListScreen = ({ forcedUserId, titleKey = 'oauthAttempts.title' }: Props) => {
  const t = useT()
  const headerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const paginationRef = useRef<HTMLDivElement>(null)
  const [outcome, setOutcome] = useState<OAuthAttemptOutcome | ''>('')

  useStickyContainer({ isEnabled: true, elementRef: headerRef, rootRef: containerRef })
  useStickyContainer({ isEnabled: true, elementRef: paginationRef, rootRef: containerRef, direction: 'bottom' })

  const { page, setPage, offset } = usePagination({ limit: 25 })

  const { data, isLoading } = useOAuthAttemptsQuery({
    limit: 25,
    offset,
    ...(forcedUserId ? { userId: forcedUserId } : {}),
    ...(outcome ? { outcome } : {}),
  })

  return (
    <div className="flex flex-col gap-4" ref={containerRef}>
      {!forcedUserId && (
        <StickyContainer ref={headerRef} className="flex flex-col gap-4 md:px-8 md:py-4 py-2 px-1">
          <TitleWithBadge title={t(titleKey)} badgeContent={<Typography variant="Body/XS/Regular">{data?.count ?? 0}</Typography>} />
          <OAuthAttemptsOutcomeFilter value={outcome} onChange={setOutcome} disabled={isLoading} />
        </StickyContainer>
      )}

      {forcedUserId && (
        <div className="flex flex-col gap-3">
          <Typography variant="heading-3">{t(titleKey)}</Typography>
          <OAuthAttemptsOutcomeFilter value={outcome} onChange={setOutcome} disabled={isLoading} />
        </div>
      )}

      <OAuthAttemptsTable items={data?.list} isLoading={isLoading} />

      <StickyContainer ref={paginationRef} className="md:px-8 md:py-4 py-2 px-1">
        <Suspense fallback={<PaginationSkeleton />}>
          <PaginationLazy currentPage={page} pages={data?.pages ?? 0} onChange={setPage} />
        </Suspense>
      </StickyContainer>
    </div>
  )
}
