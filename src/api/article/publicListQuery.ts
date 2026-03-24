import type { ArticleModel } from '~/api/article/model'
import type { ArticleFilter } from '~/api/article/types'
import { SortBy, SortOrder } from '~/api/article/types'

export type PublicArticleListItem = ArticleModel & {
  thumbnailUrl?: string | null
  title?: string | null
  description?: string | null
}

export const PUBLIC_ARTICLES_PAGE_SIZE = 20

const pickParam = (raw: Record<string, string | string[] | undefined>, key: string): string | undefined => {
  const v = raw[key]

  return Array.isArray(v) ? v[0] : v
}

/** Build filter from URL / searchParams (first page — offset forced to 0 on the page layer if needed). */
export function articleFilterFromPublicSearchParams(raw: Record<string, string | string[] | undefined>): ArticleFilter {
  const limitRaw = pickParam(raw, 'limit')
  const offsetRaw = pickParam(raw, 'offset')
  const sortByRaw = pickParam(raw, 'sortBy')
  const sortOrderRaw = pickParam(raw, 'sortOrder')

  const sortBy = sortByRaw && Object.values(SortBy).includes(sortByRaw as SortBy) ? (sortByRaw as SortBy) : SortBy.publishedAt
  const sortOrder = sortOrderRaw && Object.values(SortOrder).includes(sortOrderRaw as SortOrder) ? (sortOrderRaw as SortOrder) : SortOrder.desc

  const limitParsed = limitRaw != null && limitRaw !== '' ? Number(limitRaw) : PUBLIC_ARTICLES_PAGE_SIZE
  const offsetParsed = offsetRaw != null && offsetRaw !== '' ? Number(offsetRaw) : 0

  return {
    limit: Number.isFinite(limitParsed) && limitParsed > 0 ? limitParsed : PUBLIC_ARTICLES_PAGE_SIZE,
    offset: Number.isFinite(offsetParsed) && offsetParsed >= 0 ? offsetParsed : 0,
    cursor: pickParam(raw, 'cursor') ?? null,
    sortBy,
    sortOrder,
    startOfDateIso: pickParam(raw, 'startOfDateIso') ?? null,
    endOfDateIso: pickParam(raw, 'endOfDateIso') ?? null,
  }
}

/** Query string for filter controls (sort / range), without pagination. */
export function serializePublicListFilters(filter: Pick<ArticleFilter, 'sortBy' | 'sortOrder' | 'startOfDateIso' | 'endOfDateIso'>): string {
  const p = new URLSearchParams()

  if (filter.sortBy && filter.sortBy !== SortBy.publishedAt) {
    p.set('sortBy', filter.sortBy)
  }

  if (filter.sortOrder && filter.sortOrder !== SortOrder.desc) {
    p.set('sortOrder', filter.sortOrder)
  }

  if (filter.startOfDateIso) {
    p.set('startOfDateIso', filter.startOfDateIso)
  }

  if (filter.endOfDateIso) {
    p.set('endOfDateIso', filter.endOfDateIso)
  }

  return p.toString()
}
