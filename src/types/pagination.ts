export type PaginationMeta<T> = {
  currentPage: number
  pages: number
  list: T[]
  count: number
}
