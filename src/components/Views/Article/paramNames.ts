import { ArticleFilter, ArticleModel, ArticleStatus, ArticleVisibility, SortBy, SortOrder } from '~/api/article'

export const ARTICLES_PARAM_NAMES: Record<keyof ArticleModel & keyof Pick<ArticleFilter, 'sortBy' | 'sortOrder'>, string> = {
  id: 'ID',
  slug: 'article.fields.slug',
  version: 'article.fields.version',
  status: 'article.fields.status',
  visibility: 'article.fields.visibility',
  allowedRoles: 'article.fields.allowedRoles',
  revisionId: 'article.fields.revisionId',
  publishedAt: 'article.fields.publishedAt',
  createdAt: 'article.fields.createdAt',
  updatedAt: 'article.fields.updatedAt',
  sortBy: 'article.fields.sortBy',
  sortOrder: 'article.fields.sortOrder',
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
