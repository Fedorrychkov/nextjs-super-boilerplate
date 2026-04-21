'use client'

import { ActivityIcon, BotIcon, PencilIcon } from 'lucide-react'
import Link from 'next/link'

import { ArticleModel, ArticleStatus, ArticleVisibility } from '~/api/article'
import { CopyContainer } from '~/components/Blocks/CopyContainer'
import { CustomTable, TableDefaultSkeleton } from '~/components/Blocks/Table'
import { CustomTooltip } from '~/components/Blocks/Tooltip'
import { Badge, TableCell, TableRow, Typography } from '~/components/ui'
import { routes } from '~/constants'
import { useT } from '~/providers'
import { cn } from '~/utils/cn'
import { time } from '~/utils/time'

import { ArticleRevisions } from '../Block/client/ArticleRevisions'
import { ARTICLES_PARAM_NAMES } from '../paramNames'
import { columns } from './constants'

type Props = {
  isLoading?: boolean
  data?: ArticleModel[]
}

export const ArticleListTable = ({ isLoading, data }: Props) => {
  const t = useT()

  return (
    <CustomTable
      Row={({ item, columnKeys }) => {
        return (
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
                {item?.slug && item?.visibility === ArticleVisibility.PUBLIC && item?.status === ArticleStatus.PUBLISHED && (
                  <div className="flex flex-row gap-2 items-center justify-start mt-4">
                    <CustomTooltip content={t('navigation.rumDashboard')}>
                      <Link
                        href={`/admin/rum?pathname=/article/${item.slug}`}
                        target="_blank"
                        className="flex hover:bg-neutral-600/20 bg-neutral-600/10 p-2 rounded-lg"
                      >
                        <ActivityIcon className="md:w-4 md:h-4 w-2 h-2 shrink-0" />
                      </Link>
                    </CustomTooltip>
                    <CustomTooltip content={t('navigation.aiReferralsDashboard')}>
                      <Link
                        href={`/admin/ai-referrals?pathname=/article/${item.slug}`}
                        target="_blank"
                        className="flex hover:bg-neutral-600/20 bg-neutral-600/10 p-2 rounded-lg"
                      >
                        <BotIcon className="md:w-4 md:h-4 w-2 h-2 shrink-0" />
                      </Link>
                    </CustomTooltip>
                  </div>
                )}
              </TableCell>
            )}
            {columnKeys?.includes('slug') && (
              <TableCell className="whitespace-nowrap">
                <CopyContainer
                  content={`${process.env.NEXT_PUBLIC_SITE_URL}${item.visibility === ArticleVisibility.PUBLIC ? `${routes.articlePublic.path?.replace(':slug', item.slug ?? '')}` : `${routes.articlePrivate.path?.replace(':slug', item.slug ?? '')}`}`}
                >
                  <CustomTooltip
                    content={
                      <Typography variant="Body/XS/Regular">
                        {process.env.NEXT_PUBLIC_SITE_URL}
                        {item.visibility === ArticleVisibility.PUBLIC
                          ? `${routes.articlePublic.path?.replace(':slug', item.slug ?? '')}`
                          : `${routes.articlePrivate.path?.replace(':slug', item.slug ?? '')}`}
                      </Typography>
                    }
                  >
                    <Typography variant="Body/XS/Semibold" className="max-w-[200px] truncate">
                      {process.env.NEXT_PUBLIC_SITE_URL}
                      {item.visibility === ArticleVisibility.PUBLIC
                        ? `${routes.articlePublic.path?.replace(':slug', item.slug ?? '')}`
                        : `${routes.articlePrivate.path?.replace(':slug', item.slug ?? '')}`}
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
                    {item.status ? t(`article.statuses.${item.status}`) : '-'}
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
                  {item.visibility ? t(`article.visibilityes.${item.visibility}`) : '-'}
                </Badge>
              </TableCell>
            )}
            {columnKeys?.includes('translations') && (
              <TableCell className="whitespace-nowrap max-w-[140px]">
                <div className="flex flex-col gap-1 items-start">
                  <Typography variant="Body/XS/Semibold">{item.locale?.trim() ? item.locale : '—'}</Typography>
                  {item.translationGroupId ? (
                    <CustomTooltip content={item.translationGroupId}>
                      <Typography variant="Body/XS/Regular" className="font-mono truncate max-w-[132px]">
                        {item.translationGroupId.slice(0, 8)}…
                      </Typography>
                    </CustomTooltip>
                  ) : (
                    <Typography variant="Body/XS/Regular" className="text-muted-foreground">
                      —
                    </Typography>
                  )}
                </div>
              </TableCell>
            )}
            {columnKeys?.includes('viewCountTotal') && <TableCell className="whitespace-nowrap tabular-nums">{item.viewCountTotal ?? 0}</TableCell>}
            {columnKeys?.includes('time') && (
              <TableCell className="whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-col gap-1">
                    {[
                      { key: 'createdAt', label: t('common.createdAt'), value: item.createdAt },
                      { key: 'publishedAt', label: t('common.publishedAt'), value: item.publishedAt },
                      { key: 'updatedAt', label: t('common.updatedAt'), value: item.updatedAt },
                    ].map((value, index) => (
                      <div key={index} className="flex flex-col gap-1">
                        <Typography variant="Body/XS/Semibold">
                          {t(`article.fields.${value.key as keyof typeof ARTICLES_PARAM_NAMES}`) ?? value.label}
                        </Typography>
                        <Typography variant="Body/XS/Regular">{value.value ? time(value.value).format('DD/MM/YYYY HH:mm') : '-'}</Typography>
                      </div>
                    ))}
                  </div>
                </div>
              </TableCell>
            )}
          </TableRow>
        )
      }}
      Skeleton={TableDefaultSkeleton}
      columns={columns}
      isLoading={isLoading}
      data={data}
    />
  )
}
