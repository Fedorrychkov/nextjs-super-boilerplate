'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { ClientPublicArticleListApi } from '~/api/article/client/publicArticleList'
import { PUBLIC_ARTICLES_PAGE_SIZE, type PublicArticleListItem, serializePublicListFilters } from '~/api/article/publicListQuery'
import type { ArticleFilter } from '~/api/article/types'
import { SortBy, SortOrder } from '~/api/article/types'
import { Typography } from '~/components/ui'
import { ArticleItemClient } from '~/components/Views/Article/Block/client/ArticleItemClient'
import type { TFunction } from '~/lib/i18n'
import { useT } from '~/providers'
import type { PaginationMeta } from '~/types'
import { cn } from '~/utils/cn'

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

type PillSelectProps = {
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
}

const PillSelect = ({ label, options, value, onChange }: PillSelectProps) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    <Typography asTag="span" className="text-xs text-muted-foreground shrink-0">
      {label}:
    </Typography>
    {options.map((opt) => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={cn(
          'rounded-full px-3 py-1 text-xs font-medium transition-colors border',
          opt.value === value
            ? 'bg-foreground text-background border-foreground'
            : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/40',
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
)

export function ArticlesPublicFeed({ initial, listQuery, children }: Props) {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

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
    if (loading || !hasMore) return

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
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 flex flex-col gap-8">
      {/* Page header */}
      <div className="border-b border-border/60 pb-6">
        <Typography asTag="h1" variant="heading-1" className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">
          {t('article.ui.articles')}
        </Typography>
        <Typography className="text-muted-foreground text-sm">
          {t('article.common.showing', { count: shownCount, total: totalCount })}
          {currentQs ? (
            <>
              {' '}
              —{' '}
              <Link href={pathname} className="underline underline-offset-2 hover:text-foreground transition-colors">
                {t('article.ui.clearFilters')}
              </Link>
            </>
          ) : null}
        </Typography>
      </div>

      {/* Pill filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-3">
        <PillSelect
          label={t('article.common.sortBy')}
          value={sortBy}
          options={getSortByOptions(t)}
          onChange={(v) => applyFiltersToUrl({ sortBy: v as SortBy, sortOrder })}
        />
        <PillSelect
          label={t('article.common.order')}
          value={sortOrder}
          options={getSortOrderOptions(t)}
          onChange={(v) => applyFiltersToUrl({ sortBy, sortOrder: v as SortOrder })}
        />
      </div>

      {/* Articles grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {children}
        {extraItems.map((article) => (
          <ArticleItemClient key={article.id} article={article} />
        ))}
      </div>

      {error ? <Typography className="text-sm text-destructive">{error}</Typography> : null}

      {hasMore ? (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadMore()}
            className="flex h-10 items-center rounded-full border border-border px-6 text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
          >
            {loading ? t('article.ui.loading') : t('article.ui.loadMore')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
