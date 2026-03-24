'use client'

import { PencilIcon } from 'lucide-react'
import Link from 'next/link'

import { ArticleModel, ArticleStatus, ArticleVisibility } from '~/api/article'
import { CopyContainer } from '~/components/Blocks/CopyContainer'
import { CustomTable, TableDefaultSkeleton } from '~/components/Blocks/Table'
import { CustomTooltip } from '~/components/Blocks/Tooltip'
import { Badge, TableCell, TableRow, Typography } from '~/components/ui'
import { cn } from '~/utils/cn'
import { time } from '~/utils/time'

import { ArticleRevisions } from '../Block/ArticleRevisions'
import { ARTICLES_PARAM_NAMES, ARTICLES_STATUS_NAMES, ARTICLES_VISIBILITY_NAMES } from '../paramNames'
import { columns } from './constants'

type Props = {
  isLoading?: boolean
  data?: ArticleModel[]
}

export const ArticleListTable = ({ isLoading, data }: Props) => {
  return (
    <CustomTable
      Row={({ item, columnKeys }) => (
        <TableRow key={item.id}>
          {columnKeys?.includes('id') && (
            <TableCell className="font-medium">
              <div className="flex flex-row gap-2 items-center justify-start">
                <Link href={`/admin/articles/${item.id}`} target="_blank" className="hover:bg-neutral-600/20 bg-neutral-600/10 p-2 rounded-lg">
                  <PencilIcon className="md:w-4 md:h-4 w-2 h-2" />
                </Link>
                <CustomTooltip
                  content={
                    <CopyContainer content={item.id}>
                      <Typography variant="Body/L/Semibold">{item.id}</Typography>
                    </CopyContainer>
                  }
                >
                  <CopyContainer content={item.id}>
                    <Typography variant="Body/XS/Semibold" className="max-w-[40px] truncate">
                      {item.id}
                    </Typography>
                  </CopyContainer>
                </CustomTooltip>
              </div>
            </TableCell>
          )}
          {columnKeys?.includes('slug') && (
            <TableCell className="whitespace-nowrap">
              <CopyContainer
                content={`${process.env.NEXT_PUBLIC_SITE_URL}/${item.visibility === ArticleVisibility.PUBLIC ? 'article/' : 'private-article/'}${item.slug}`}
              >
                <CustomTooltip
                  content={
                    <Typography variant="Body/XS/Regular">
                      {process.env.NEXT_PUBLIC_SITE_URL}/{item.visibility === ArticleVisibility.PUBLIC ? 'article/' : 'private-article/'}
                      {item.slug}
                    </Typography>
                  }
                >
                  <Typography variant="Body/XS/Semibold" className="max-w-[200px] truncate">
                    {process.env.NEXT_PUBLIC_SITE_URL}/{item.visibility === ArticleVisibility.PUBLIC ? 'article/' : 'private-article/'}
                    {item.slug}
                  </Typography>
                </CustomTooltip>
              </CopyContainer>
              <ArticleRevisions article={item} />
            </TableCell>
          )}
          {columnKeys?.includes('status') && (
            <TableCell className="whitespace-nowrap">
              <div className="flex flex-col gap-2 items-start justify-start">
                <Badge
                  className={cn(
                    'whitespace-nowrap',
                    item.status === ArticleStatus.DRAFT && 'bg-yellow-500 text-white',
                    item.status === ArticleStatus.PUBLISHED && 'bg-green-500 text-white',
                    item.status === ArticleStatus.UNPUBLISHED && 'bg-red-500 text-white',
                  )}
                >
                  {item.status ? ARTICLES_STATUS_NAMES[item.status] : '-'}
                </Badge>
              </div>
            </TableCell>
          )}

          {columnKeys?.includes('visibility') && (
            <TableCell className="whitespace-nowrap">
              <Badge
                className={cn(
                  'whitespace-nowrap',
                  item.visibility === ArticleVisibility.PUBLIC && 'bg-green-500 text-white',
                  item.visibility === ArticleVisibility.PRIVATE && 'bg-red-500 text-white',
                  item.visibility === ArticleVisibility.LINK_ONLY && 'bg-yellow-500 text-white',
                )}
              >
                {item.visibility ? ARTICLES_VISIBILITY_NAMES[item.visibility] : '-'}
              </Badge>
            </TableCell>
          )}
          {columnKeys?.includes('time') && (
            <TableCell className="whitespace-nowrap">
              <div className="flex flex-col gap-1">
                <div className="flex flex-col gap-1">
                  {[
                    { key: 'createdAt', label: 'Created At', value: item.createdAt },
                    { key: 'publishedAt', label: 'Published At', value: item.publishedAt },
                    { key: 'updatedAt', label: 'Updated At', value: item.updatedAt },
                  ].map((value, index) => (
                    <div key={index} className="flex flex-col gap-1">
                      <Typography variant="Body/XS/Semibold">{ARTICLES_PARAM_NAMES[value.key as keyof typeof ARTICLES_PARAM_NAMES] ?? value.label}</Typography>
                      <Typography variant="Body/XS/Regular">{value.value ? time(value.value).format('DD/MM/YYYY HH:mm') : '-'}</Typography>
                    </div>
                  ))}
                </div>
              </div>
            </TableCell>
          )}
        </TableRow>
      )}
      Skeleton={TableDefaultSkeleton}
      columns={columns}
      isLoading={isLoading}
      data={data}
    />
  )
}
