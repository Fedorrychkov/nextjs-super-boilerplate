import { AnyString } from '~/types'

export type Column<T> = {
  header: string
  accessorKey: keyof T | AnyString
  meta?: {
    header?: {
      className?: string
    }
    row?: {
      className?: string
    }
  }
}
