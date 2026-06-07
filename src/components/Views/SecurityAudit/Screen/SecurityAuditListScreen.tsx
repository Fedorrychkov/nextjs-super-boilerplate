'use client'

import { lazy, Suspense, useRef } from 'react'

import { TitleWithBadge } from '~/components/Blocks/TitleWithBadge'
import { StickyContainer } from '~/components/Containers'
import { PaginationSkeleton } from '~/components/List'
import { usePagination } from '~/components/List/usePagination'
import { Typography } from '~/components/ui'
import { useStickyContainer } from '~/hooks/useStickyContainer'
import { useT } from '~/providers'
import { useSecurityAuditQuery } from '~/query/security-audit'

import { SecurityAuditTable } from '../List/SecurityAuditTable'

const PaginationLazy = lazy(() => import('~/components/List').then((mod) => ({ default: mod.Pagination })))

type Props = {
  forcedTargetUserId?: string
  titleKey?: 'securityAudit.title' | 'securityAudit.userTitle'
}

export const SecurityAuditListScreen = ({ forcedTargetUserId, titleKey = 'securityAudit.title' }: Props) => {
  const t = useT()
  const headerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const paginationRef = useRef<HTMLDivElement>(null)

  useStickyContainer({ isEnabled: true, elementRef: headerRef, rootRef: containerRef })
  useStickyContainer({ isEnabled: true, elementRef: paginationRef, rootRef: containerRef, direction: 'bottom' })

  const { page, setPage, offset } = usePagination({ limit: 25 })

  const { data, isLoading } = useSecurityAuditQuery({
    limit: 25,
    offset,
    ...(forcedTargetUserId ? { targetUserId: forcedTargetUserId } : {}),
  })

  return (
    <div className="flex flex-col gap-4" ref={containerRef}>
      {!forcedTargetUserId && (
        <StickyContainer ref={headerRef} className="flex flex-row gap-4 items-center justify-between md:px-8 md:py-4 py-2 px-1">
          <TitleWithBadge title={t(titleKey)} badgeContent={<Typography variant="Body/XS/Regular">{data?.count ?? 0}</Typography>} />
        </StickyContainer>
      )}

      {forcedTargetUserId && <Typography variant="heading-3">{t(titleKey)}</Typography>}

      <SecurityAuditTable items={data?.list} isLoading={isLoading} />

      <StickyContainer ref={paginationRef} className="md:px-8 md:py-4 py-2 px-1">
        <Suspense fallback={<PaginationSkeleton />}>
          <PaginationLazy currentPage={page} pages={data?.pages ?? 0} onChange={setPage} />
        </Suspense>
      </StickyContainer>
    </div>
  )
}
