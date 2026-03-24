'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ClientPublicArticleListApi } from '~/api/article/client/publicArticleList'
import { PUBLIC_ARTICLES_PAGE_SIZE, type PublicArticleListItem, serializePublicListFilters } from '~/api/article/publicListQuery'
import type { ArticleFilter } from '~/api/article/types'
import { SortBy, SortOrder } from '~/api/article/types'
import { Button } from '~/components/ui/button'
import { Select } from '~/components/ui/select-1'
import { Typography } from '~/components/ui/Typography/Typography'
import { ArticleItem } from '~/components/Views/Article/Block/ArticleItem'
import type { PaginationMeta } from '~/types'

type Props = {
  initial: PaginationMeta<PublicArticleListItem>
  listQuery: ArticleFilter
}

const SORT_BY_OPTIONS = [
  { value: SortBy.publishedAt, label: 'Published date' },
  { value: SortBy.createdAt, label: 'Created date' },
  { value: SortBy.updatedAt, label: 'Updated date' },
]

const SORT_ORDER_OPTIONS = [
  { value: SortOrder.desc, label: 'Newest first' },
  { value: SortOrder.asc, label: 'Oldest first' },
]

export function ArticlesPublicFeed({ initial, listQuery }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [items, setItems] = useState<PublicArticleListItem[]>(() => initial.list)
  const [totalCount, setTotalCount] = useState(initial.count)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortBy = listQuery.sortBy ?? SortBy.publishedAt
  const sortOrder = listQuery.sortOrder ?? SortOrder.desc

  useEffect(() => {
    setItems(initial.list)
    setTotalCount(initial.count)
    setError(null)
  }, [initial.list, initial.count, listQuery.sortBy, listQuery.sortOrder, listQuery.startOfDateIso, listQuery.endOfDateIso])

  const hasMore = items.length < totalCount

  const applyFiltersToUrl = (next: Pick<ArticleFilter, 'sortBy' | 'sortOrder' | 'startOfDateIso' | 'endOfDateIso'>) => {
    const qs = serializePublicListFilters({
      sortBy: next.sortBy ?? sortBy,
      sortOrder: next.sortOrder ?? sortOrder,
      startOfDateIso: next.startOfDateIso ?? listQuery.startOfDateIso,
      endOfDateIso: next.endOfDateIso ?? listQuery.endOfDateIso,
    })

    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const loadMore = async () => {
    if (loading || !hasMore) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const api = new ClientPublicArticleListApi()
      const page = await api.getList({
        ...listQuery,
        limit: PUBLIC_ARTICLES_PAGE_SIZE,
        offset: items.length,
      })

      setItems((prev) => {
        const seen = new Set(prev.map((a) => a.id))

        return [...prev, ...page.list.filter((a) => !seen.has(a.id))]
      })
      setTotalCount(page.count)
    } catch {
      setError('Could not load more articles.')
    } finally {
      setLoading(false)
    }
  }

  const currentQs = searchParams.toString()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Typography variant="heading-3">Articles</Typography>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            size="small"
            label="Sort by"
            value={sortBy}
            options={SORT_BY_OPTIONS}
            onChange={(e) => applyFiltersToUrl({ sortBy: e.target.value as SortBy, sortOrder })}
          />
          <Select
            size="small"
            label="Order"
            value={sortOrder}
            options={SORT_ORDER_OPTIONS}
            onChange={(e) => applyFiltersToUrl({ sortBy, sortOrder: e.target.value as SortOrder })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 text-sm text-muted-foreground">
        <span>
          Showing {items.length} of {totalCount}
          {currentQs ? (
            <>
              {' '}
              —{' '}
              <Link href={pathname} className="underline">
                Clear filters
              </Link>
            </>
          ) : null}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {items.map((article) => (
          <ArticleItem key={article.id} article={article} />
        ))}
      </div>

      {error ? (
        <Typography variant="Body/S/Regular" className="text-destructive">
          {error}
        </Typography>
      ) : null}

      {hasMore ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" disabled={loading} onClick={() => void loadMore()}>
            {loading ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
