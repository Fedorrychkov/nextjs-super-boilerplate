import { ArticleFilter, ArticleStatus, ArticleVisibility, SortBy, SortOrder } from '~/api/article'
import type { FilterOption } from '~/types'

import { ARTICLES_SORT_BY_NAMES, ARTICLES_SORT_ORDER_NAMES, ARTICLES_STATUS_NAMES, ARTICLES_VISIBILITY_NAMES } from '../paramNames'

export type DefaultArticlesFiltersKeys = keyof Pick<ArticleFilter, 'status' | 'visibility' | 'sortBy' | 'sortOrder'>

export const DefaultArticlesFilters: Record<DefaultArticlesFiltersKeys, FilterOption> = {
  status: {
    value: null,
    options: Object.values(ArticleStatus).map((status) => ({
      value: status,
      label: ARTICLES_STATUS_NAMES[status],
      labelLocalizationKey: `article.statuses.${status}`,
    })),
  },
  visibility: {
    value: null,
    options: Object.values(ArticleVisibility).map((visibility) => ({
      value: visibility,
      label: ARTICLES_VISIBILITY_NAMES[visibility],
      labelLocalizationKey: `article.visibilityes.${visibility}`,
    })),
  },
  sortBy: {
    value: null,
    options: Object.values(SortBy).map((sortBy) => ({
      value: sortBy,
      label: ARTICLES_SORT_BY_NAMES[sortBy],
      labelLocalizationKey: `article.fields.${sortBy}`,
    })),
  },
  sortOrder: {
    value: null,
    options: Object.values(SortOrder).map((sortOrder) => ({
      value: sortOrder,
      label: ARTICLES_SORT_ORDER_NAMES[sortOrder],
      labelLocalizationKey: `common.sortOrderes.${sortOrder}`,
    })),
  },
}
