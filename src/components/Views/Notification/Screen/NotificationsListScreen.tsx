'use client'

import { FilterIcon, XIcon } from 'lucide-react'
import { lazy, Suspense, useRef, useState } from 'react'

import { TitleWithBadge } from '~/components/Blocks/TitleWithBadge'
import { CustomTooltip } from '~/components/Blocks/Tooltip'
import { StickyContainer } from '~/components/Containers'
import { useDefaultFilters } from '~/components/Filters/useDefaultFilters'
import { PaginationSkeleton } from '~/components/List'
import { usePagination } from '~/components/List/usePagination'
import { Badge, Button, Input, Typography } from '~/components/ui'
import { useStickyContainer } from '~/hooks/useStickyContainer'
import type { AppMessageKey } from '~/lib/i18n'
import { useT } from '~/providers'
import { useNotificationsListQuery } from '~/query/notification'

import { DefaultNotificationsFilters, NOTIFICATIONS_PARAM_NAMES } from '../Filters/defaultNotificationsFilter'
import { NotificationsFilter } from '../Filters/NotificationsFilter'
import { NotificationListItem } from '../List/NotificationListItem'

const PaginationLazy = lazy(() => import('~/components/List').then((mod) => ({ default: mod.Pagination })))

type Props = {
  mode: 'mine' | 'admin'
  forcedRecipientUserId?: string
  titleKey?: 'platformNotifications.title' | 'platformNotifications.adminTitle'
}

export const NotificationsListScreen = ({ mode, forcedRecipientUserId, titleKey = 'platformNotifications.title' }: Props) => {
  const t = useT()
  const headerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const paginationRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)
  const [recipientUserId, setRecipientUserId] = useState('')

  useStickyContainer({ isEnabled: true, elementRef: headerRef, rootRef: containerRef })
  useStickyContainer({ isEnabled: true, elementRef: paginationRef, rootRef: containerRef, direction: 'bottom' })

  const {
    isFilterOpen,
    toggleFilter,
    handleClearFilters,
    filters,
    debouncedFilters,
    setFilters,
    handleChangePeriod,
    period,
    isPeriodEnabled,
    settledFiltersCount,
  } = useDefaultFilters<Record<string, unknown>>({
    ref: filtersRef,
    defaultFilterValues: { deliveryStatus: null, type: null },
    filterValues: DefaultNotificationsFilters,
  })

  const { page, setPage, offset } = usePagination({ limit: 25 })

  const effectiveRecipientUserId = forcedRecipientUserId || recipientUserId.trim() || undefined

  const { data, isLoading } = useNotificationsListQuery(
    mode,
    {
      limit: 25,
      offset,
      startOfDateIso: period?.fromDate,
      endOfDateIso: period?.toDate,
      ...debouncedFilters,
      ...(effectiveRecipientUserId ? { recipientUserId: effectiveRecipientUserId } : {}),
    },
    isPeriodEnabled,
  )

  const filterCount = settledFiltersCount + (recipientUserId.trim() ? 1 : 0)

  return (
    <div className="flex flex-col gap-4" ref={containerRef}>
      {!forcedRecipientUserId && (
        <StickyContainer ref={headerRef} className="flex flex-row gap-4 items-center justify-between md:px-8 md:py-4 py-2 px-1">
          <TitleWithBadge title={t(titleKey)} badgeContent={<Typography variant="Body/XS/Regular">{data?.count ?? 0}</Typography>} />
          <div className="flex flex-row gap-2">
            <CustomTooltip content={<Typography variant="Body/XS/Regular">{isFilterOpen ? t('common.hideFilters') : t('common.showFilters')}</Typography>}>
              <Button variant={isFilterOpen ? 'default' : 'outline'} size="sm-md" className="flex items-center gap-2" onClick={toggleFilter}>
                <div className="relative">
                  <FilterIcon className="md:w-4 md:h-4 w-2 h-2" />
                  <Badge variant="default" className="absolute -top-4 -right-4">
                    {filterCount}
                  </Badge>
                </div>
              </Button>
            </CustomTooltip>
            <CustomTooltip content={<Typography variant="Body/XS/Regular">{t('common.clearFilters')}</Typography>}>
              {filterCount > 0 && (
                <Button
                  variant="outline"
                  size="sm-md"
                  className="flex items-center gap-2"
                  onClick={() => {
                    handleClearFilters()
                    setRecipientUserId('')
                  }}
                >
                  <XIcon className="md:w-4 md:h-4 w-2 h-2" />
                </Button>
              )}
            </CustomTooltip>
          </div>
        </StickyContainer>
      )}

      {!forcedRecipientUserId && (
        <>
          <NotificationsFilter
            ref={filtersRef}
            isFilterOpen={isFilterOpen}
            isLoading={isLoading}
            filters={filters}
            defaultFilterValues={DefaultNotificationsFilters}
            paramNames={NOTIFICATIONS_PARAM_NAMES}
            setFilters={setFilters}
            t={t}
            handleChangePeriod={handleChangePeriod}
          />
          {mode === 'admin' && isFilterOpen && (
            <div className="flex flex-col rounded-md gap-2 bg-muted p-2">
              <Typography variant="Body/S/Regular">{t('platformNotifications.filters.recipientUserId' as AppMessageKey)}</Typography>
              <Input
                type="text"
                value={recipientUserId}
                onChange={(e) => setRecipientUserId(e.target.value)}
                placeholder={t('platformNotifications.filters.recipientUserIdPlaceholder' as AppMessageKey)}
              />
            </div>
          )}
        </>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-28 rounded-xl border bg-muted animate-pulse" />
          ))}
        </div>
      ) : data?.list?.length ? (
        <div className="flex flex-col gap-3">
          {data.list.map((item) => (
            <NotificationListItem key={item.id} item={item} showAdminExtras={mode === 'admin'} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Typography variant="Body/M/Regular">{t('platformNotifications.empty')}</Typography>
        </div>
      )}

      {isLoading ? (
        <PaginationSkeleton />
      ) : (
        <Suspense fallback={<PaginationSkeleton />}>
          <StickyContainer direction="top" ref={paginationRef} className="flex flex-row gap-4 items-center justify-between md:px-8 md:py-4 py-2 px-1">
            <PaginationLazy currentPage={page} pages={data?.pages ?? 0} onChange={setPage} />
          </StickyContainer>
        </Suspense>
      )}
    </div>
  )
}
