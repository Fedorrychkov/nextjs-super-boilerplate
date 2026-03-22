import { ArticleRevisionModel } from './model'

export type ArticleRevisionFilter = Partial<Omit<ArticleRevisionModel, 'createdAt' | 'updatedAt'>> & {
  limit?: number | null
  offset?: number | null
  /**
   * Cursor pagination: last `_id` from previous portion (hex ObjectId).
   * If set, `offset` is ignored; sorting is done by `_id` (see `findListPaginated` documentation).
   */
  cursor?: string | null
  startOfDateIso?: string | null
  endOfDateIso?: string | null
  sortBy?: SortBy | null
  sortOrder?: SortOrder | null
}

export enum SortBy {
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
  publishedAt = 'publishedAt',
}

export enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}
