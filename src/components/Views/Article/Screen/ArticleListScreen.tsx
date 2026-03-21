'use client'

import { PlusIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { lazy, Suspense, useRef } from 'react'

import { TableDefaultSkeleton } from '~/components/Blocks/Table'
import { TitleWithBadge } from '~/components/Blocks/TitleWithBadge'
import { CustomTooltip } from '~/components/Blocks/Tooltip'
import { StickyContainer } from '~/components/Containers'
import { PaginationSkeleton } from '~/components/List'
import { Button, Typography } from '~/components/ui'
import { routes } from '~/constants'
import { useStickyContainer } from '~/hooks/useStickyContainer'

const PaginationLazy = lazy(() => import('~/components/List').then((mod) => ({ default: mod.Pagination })))

export const ArticleListScreen = () => {
  const router = useRouter()
  const headerRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const paginationRef = useRef<HTMLDivElement>(null)

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

  const data = {
    count: 100,
    list: [],
    pages: 10,
  }

  const isLoading = false
  const page = 1
  const setPage = (page: number) => {
    console.log(page)
  }

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
                    <PlusIcon className="md:w-4 md:h-4 w-2 h-2 shrink-0 text-secondary-600 bg-secondary-600/10 p-1 rounded-full" />
                    <Typography variant="Body/XS/Semibold">Add new</Typography>
                  </div>
                </Button>
              </CustomTooltip>
            </div>
          </div>
        </StickyContainer>
      </div>
      {isLoading ? <TableDefaultSkeleton size={10} /> : <Suspense fallback={<TableDefaultSkeleton size={10} />}>List here</Suspense>}
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
