import { UserModel } from '~/api/user'
import { AnyString } from '~/types'

type Column = {
  header: string
  accessorKey: keyof UserModel | AnyString
}

export const columns: Column[] = [
  {
    header: 'ID',
    accessorKey: 'id',
  },
  {
    header: 'Role',
    accessorKey: 'role',
  },
  {
    header: 'Status',
    accessorKey: 'status',
  },
  {
    header: 'Email origin',
    accessorKey: 'emailOrigin',
  },
  {
    header: 'Dates',
    accessorKey: 'time',
  },
]
