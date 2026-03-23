import { ArticleFilter, ArticleModel, ArticleStatus, ArticleVisibility, SortBy, SortOrder } from '~/api/article'

export const ARTICLES_PARAM_NAMES: Record<keyof ArticleModel & keyof Pick<ArticleFilter, 'sortBy' | 'sortOrder'>, string> = {
  id: 'ID',
  slug: 'Slug',
  version: 'Version',
  status: 'Status',
  visibility: 'Visibility',
  allowedRoles: 'Allowed Roles',
  revisionId: 'Revision ID',
  publishedAt: 'Published At',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
  sortBy: 'Sort By',
  sortOrder: 'Sort Order',
}

export const ARTICLES_STATUS_NAMES: Record<Exclude<ArticleStatus, null>, string> = {
  [ArticleStatus.DRAFT]: 'Draft',
  [ArticleStatus.PUBLISHED]: 'Published',
  [ArticleStatus.UNPUBLISHED]: 'Unpublished',
}

export const ARTICLES_VISIBILITY_NAMES: Record<Exclude<ArticleVisibility, null>, string> = {
  [ArticleVisibility.PUBLIC]: 'Public',
  [ArticleVisibility.PRIVATE]: 'Private',
  [ArticleVisibility.LINK_ONLY]: 'Link Only',
}

export const ARTICLES_SORT_BY_NAMES: Record<Exclude<SortBy, null>, string> = {
  [SortBy.createdAt]: 'Created At',
  [SortBy.updatedAt]: 'Updated At',
  [SortBy.publishedAt]: 'Published At',
}

export const ARTICLES_SORT_ORDER_NAMES: Record<Exclude<SortOrder, null>, string> = {
  [SortOrder.asc]: 'Ascending',
  [SortOrder.desc]: 'Descending',
}
