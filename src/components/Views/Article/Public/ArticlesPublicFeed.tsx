'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { ClientPublicArticleListApi } from '~/api/article/client/publicArticleList'
import { PUBLIC_ARTICLES_PAGE_SIZE, type PublicArticleListItem, serializePublicListFilters } from '~/api/article/publicListQuery'
import type { ArticleFilter } from '~/api/article/types'
import { SortBy, SortOrder } from '~/api/article/types'
import { Button } from '~/components/ui/button'
import { Select } from '~/components/ui/select-1'
import { Typography } from '~/components/ui/Typography/Typography'
import { ArticleItemClient } from '~/components/Views/Article/Block/client/ArticleItemClient'
import type { TFunction } from '~/lib/i18n'
import { useT } from '~/providers'
import type { PaginationMeta } from '~/types'

type Props = {
  initial: PaginationMeta<PublicArticleListItem>
  listQuery: ArticleFilter
  /** First page of cards — render on the server (RSC) and pass here for SEO / crawlers. */
  children: ReactNode
}

const getSortByOptions = (t: TFunction) => [
  { value: SortBy.publishedAt, label: t('article.common.publishedAt') },
  { value: SortBy.createdAt, label: t('article.common.createdAt') },
  { value: SortBy.updatedAt, label: t('article.common.updatedAt') },
]

const getSortOrderOptions = (t: TFunction) => [
  { value: SortOrder.desc, label: t('article.common.newestFirst') },
  { value: SortOrder.asc, label: t('article.common.oldestFirst') },
]

export function ArticlesPublicFeed({ initial, listQuery, children }: Props) {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  /** Items loaded only via “Load more” (first page is `children` from the server). */
  const [extraItems, setExtraItems] = useState<PublicArticleListItem[]>([])
  const [totalCount, setTotalCount] = useState(initial.count)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sortBy = listQuery.sortBy ?? SortBy.publishedAt
  const sortOrder = listQuery.sortOrder ?? SortOrder.desc

  useEffect(() => {
    setExtraItems([])
    setTotalCount(initial.count)
    setError(null)
  }, [initial.list, initial.count, listQuery.sortBy, listQuery.sortOrder, listQuery.startOfDateIso, listQuery.endOfDateIso])

  const shownCount = initial.list.length + extraItems.length
  const hasMore = shownCount < totalCount

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
        offset: shownCount,
      })

      setExtraItems((prev) => {
        const seen = new Set([...initial.list.map((a) => a.id), ...prev.map((a) => a.id)])

        return [...prev, ...page.list.filter((a) => !seen.has(a.id))]
      })
      setTotalCount(page.count)
    } catch {
      setError(t('article.errors.couldNotLoadMoreArticles'))
    } finally {
      setLoading(false)
    }
  }

  const currentQs = searchParams.toString()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Typography variant="heading-3">{t('article.ui.articles')}</Typography>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            size="small"
            label={t('article.common.sortBy')}
            value={sortBy}
            options={getSortByOptions(t)}
            onChange={(e) => applyFiltersToUrl({ sortBy: e.target.value as SortBy, sortOrder })}
          />
          <Select
            size="small"
            label={t('article.common.order')}
            value={sortOrder}
            options={getSortOrderOptions(t)}
            onChange={(e) => applyFiltersToUrl({ sortBy, sortOrder: e.target.value as SortOrder })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 text-sm text-muted-foreground">
        <span>
          {t('article.common.showing', { count: shownCount, total: totalCount })}
          {currentQs ? (
            <>
              {' '}
              —{' '}
              <Link href={pathname} className="underline">
                {t('article.ui.clearFilters')}
              </Link>
            </>
          ) : null}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {children}
        {extraItems.map((article) => (
          <ArticleItemClient key={article.id} article={article} />
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
            {loading ? t('article.ui.loading') : t('article.ui.loadMore')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
