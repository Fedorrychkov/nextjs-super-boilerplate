import type { PaginationMeta } from '~/types/pagination'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 100

export function clampLimit(limit?: number | null): number {
  if (limit == null || Number.isNaN(limit)) {
    return DEFAULT_LIMIT
  }

  return Math.max(1, Math.min(Math.floor(limit), MAX_LIMIT))
}

/**
 * Offset : currentPage = floor(offset/limit)+1, pages = ceil(count/limit).
 * Cursor: offset is ignored; currentPage = 1 (next portion — with new cursor); pages = ceil(count/limit) for full filter without cursor.
 */
export function buildPaginationMeta<T>(opts: {
  list: T[]
  count: number
  limit?: number | null
  offset?: number | null
  cursor?: string | null
}): PaginationMeta<T> {
  const limit = clampLimit(opts.limit)
  const count = opts.count
  const pages = count === 0 ? 0 : Math.ceil(count / limit)
  const offset = opts.cursor ? 0 : Math.max(0, opts.offset ?? 0)
  const currentPage = opts.cursor ? 1 : pages === 0 ? 1 : Math.min(pages, Math.floor(offset / limit) + 1)

  return {
    list: opts.list,
    count,
    pages,
    currentPage: Math.max(1, currentPage),
  }
}
