import { HorizontalContainer } from '~/components/Containers'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui'
import { AnyString } from '~/types'
import { cn } from '~/utils/cn'
import { logger } from '~/utils/logger'

import { Column } from './table.types'
import { TableDefaultSkeleton } from './TableDefaultSkeleton'

type WithId = { id: string | number }

type Props<T> = {
  isLoading?: boolean
  data?: T[]
  columns: Column<T>[]
  container?: boolean
  Skeleton?: React.ComponentType<{ size: number }>
  EmptyPlaceholder?: React.ComponentType
  Row?: React.ComponentType<{ item: T; columnKeys?: (AnyString | keyof T)[] }>
}

export function CustomTable<T extends WithId>(props: Props<T>) {
  const { data, isLoading, columns, container, EmptyPlaceholder, Skeleton = TableDefaultSkeleton, Row } = props

  if (isLoading) {
    return <Skeleton size={columns.length} />
  }

  if (!Row) {
    logger.error('Row is important for table')

    return null
  }

  const columnKeys = columns.map((column) => column.accessorKey)

  return (
    <HorizontalContainer container={container}>
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={[column.accessorKey].join('')} className={cn(column?.meta?.header?.className)}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.length ? (
            data.map((item, index) => <Row key={item?.id ?? index} columnKeys={columnKeys} item={item} />)
          ) : (
            <TableRow>
              <TableCell colSpan={columnKeys.length} className="text-center py-6">
                {EmptyPlaceholder ? <EmptyPlaceholder /> : 'No items'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </HorizontalContainer>
  )
}
