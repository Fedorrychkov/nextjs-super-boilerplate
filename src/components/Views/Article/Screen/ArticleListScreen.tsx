'use client'

import { FilterIcon, PlusIcon, XIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { lazy, Suspense, useRef } from 'react'

import { TableDefaultSkeleton } from '~/components/Blocks/Table'
import { TitleWithBadge } from '~/components/Blocks/TitleWithBadge'
import { CustomTooltip } from '~/components/Blocks/Tooltip'
import { StickyContainer } from '~/components/Containers'
import { useDefaultFilters } from '~/components/Filters/useDefaultFilters'
import { PaginationSkeleton } from '~/components/List'
import { usePagination } from '~/components/List/usePagination'
import { Badge, Button, Typography } from '~/components/ui'
import { routes } from '~/constants'
import { useStickyContainer } from '~/hooks/useStickyContainer'
import { useArticlesListQuery } from '~/query/article'

import { ArticlesFilter, DefaultArticlesFilters } from '../Filters'
import { columns } from '../List/constants'
import { ARTICLES_PARAM_NAMES } from '../paramNames'

const PaginationLazy = lazy(() => import('~/components/List').then((mod) => ({ default: mod.Pagination })))
const ArticleListTableLazy = lazy(() => import('../List/ArticlesListTable').then((mod) => ({ default: mod.ArticleListTable })))

export const ArticleListScreen = () => {
  const router = useRouter()
  const headerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const paginationRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)

  useStickyContainer({
    isEnabled: true,
    elementRef: headerRef,
    rootRef: containerRef,
  })
  useStickyContainer({
    isEnabled: true,
    elementRef: paginationRef,
    rootRef: containerRef,
    direction: 'bottom',
  })

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
    defaultFilterValues: { status: null },
    filterValues: DefaultArticlesFilters,
  })

  const { page, setPage, offset } = usePagination({ limit: 25 })

  const { data, isLoading } = useArticlesListQuery(
    { limit: 25, offset, startOfDateIso: period?.fromDate, endOfDateIso: period?.toDate, ...debouncedFilters },
    isPeriodEnabled,
  )

  return (
    <div className="flex flex-col gap-4" ref={containerRef}>
      <div className="flex flex-col gap-4">
        <StickyContainer ref={headerRef} className="flex flex-row gap-4 items-center justify-between md:px-8 md:py-4 py-2 px-1">
          <TitleWithBadge title="Articles" badgeContent={<Typography variant="Body/XS/Regular">{data?.count ?? 0}</Typography>} />
          <div className="flex md:flex-row flex-col items-end md:items-center gap-2">
            <div className="flex flex-row gap-2">
              <CustomTooltip content={<Typography variant="Body/XS/Regular">Create new Article</Typography>}>
                <Button variant="outline" size="sm-md" className="flex items-center gap-2" onClick={() => router.push(routes.articlesCreate.path)}>
                  <div className="relative flex items-center gap-2">
                    <PlusIcon className="md:w-4 md:h-4 w-2 h-2 shrink-0 text-neutral-600 bg-neutral-600/10 rounded-full" />
                    <Typography variant="Body/XS/Semibold">Add new</Typography>
                  </div>
                </Button>
              </CustomTooltip>

              <CustomTooltip content={<Typography variant="Body/XS/Regular">{isFilterOpen ? 'Hide filters' : 'Show filters'}</Typography>}>
                <Button variant={isFilterOpen ? 'default' : 'outline'} size="sm-md" className="flex items-center gap-2" onClick={toggleFilter}>
                  <div className="relative">
                    <FilterIcon className="md:w-4 md:h-4 w-2 h-2" />
                    <Badge variant="default" className="absolute -top-4 -right-4">
                      {settledFiltersCount}
                    </Badge>
                  </div>
                </Button>
              </CustomTooltip>
              <CustomTooltip content={<Typography variant="Body/XS/Regular">Clear filters</Typography>}>
                {settledFiltersCount > 0 && (
                  <Button variant="outline" size="sm-md" className="flex items-center gap-2" onClick={handleClearFilters}>
                    <XIcon className="md:w-4 md:h-4 w-2 h-2" />
                  </Button>
                )}
              </CustomTooltip>
            </div>
          </div>
        </StickyContainer>
      </div>
      <ArticlesFilter
        ref={filtersRef}
        isFilterOpen={isFilterOpen}
        isLoading={isLoading}
        filters={filters}
        defaultFilterValues={DefaultArticlesFilters}
        paramNames={ARTICLES_PARAM_NAMES}
        setFilters={setFilters}
        handleChangePeriod={handleChangePeriod}
      />
      {isLoading ? (
        <TableDefaultSkeleton size={columns.length} />
      ) : (
        <Suspense fallback={<TableDefaultSkeleton size={columns.length} />}>
          <ArticleListTableLazy data={data?.list} isLoading={isLoading} />
        </Suspense>
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
