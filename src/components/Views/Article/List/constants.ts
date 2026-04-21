import { ArticleModel } from '~/api/article'
import { AnyString } from '~/types'

type Column = {
  header: string
  accessorKey: keyof ArticleModel | AnyString
}

export const columns: Column[] = [
  {
    header: 'ID',
    accessorKey: 'id',
  },
  {
    header: 'Slug',
    accessorKey: 'slug',
  },
  {
    header: 'Status',
    accessorKey: 'status',
  },
  {
    header: 'Visibility',
    accessorKey: 'visibility',
  },
  {
    header: 'Locale / group',
    accessorKey: 'translations',
  },
  {
    header: 'Views',
    accessorKey: 'viewCountTotal',
  },
  {
    header: 'Dates',
    accessorKey: 'time',
  },
]
