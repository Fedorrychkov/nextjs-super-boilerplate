'use client'

import { ChevronRightIcon } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'

import { TitleWithBadge } from '~/components/Blocks/TitleWithBadge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { Typography } from '~/components/ui/Typography/Typography'
import { routes } from '~/constants'
import { useT } from '~/providers'
import { useArticleViewsByArticleQuery, useArticleViewsDashboardQuery } from '~/query/article-views/query'
import { time } from '~/utils/time'

export const ArticleViewsDashboardScreen = () => {
  const t = useT()
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null)
  const { data, isLoading, isError } = useArticleViewsDashboardQuery(80)
  const { data: detail, isLoading: detailLoading } = useArticleViewsByArticleQuery(selectedArticleId, Boolean(selectedArticleId))

  const badge = useMemo(() => {
    if (isLoading) {
      return '…'
    }

    return data?.totalViews ?? '—'
  }, [data?.totalViews, isLoading])

  return (
    <div className="flex flex-col gap-6 md:px-8 px-2 py-4 w-full max-w-full mx-auto">
      <TitleWithBadge title={t('navigation.articleViewsDashboard')} badgeContent={<Typography variant="Body/XS/Regular">{badge}</Typography>} />

      <Typography variant="Body/XS/Regular" className="text-muted-foreground">
        {t('article.views.ui.subtitle')}
      </Typography>

      {isError && (
        <Typography variant="Body/S/Regular" className="text-destructive">
          {t('article.views.ui.loadFailed')}
        </Typography>
      )}

      {data && !data.articles.length && (
        <Typography variant="Body/S/Regular" className="text-muted-foreground">
          {t('article.views.ui.noArticles')}
        </Typography>
      )}

      {data && data.articles.length > 0 && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>{t('article.views.ui.slug')}</TableHead>
                <TableHead>{t('article.fields.visibility')}</TableHead>
                <TableHead className="text-right">{t('article.views.ui.articleViews')}</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.articles.map((row) => {
                const open = selectedArticleId === row.articleId

                return (
                  <TableRow key={row.articleId} className="cursor-pointer" onClick={() => setSelectedArticleId(open ? null : row.articleId)}>
                    <TableCell>
                      <ChevronRightIcon className={`size-4 transition-transform ${open ? 'rotate-90' : ''}`} />
                    </TableCell>
                    <TableCell className="font-medium">{row.slug ?? '—'}</TableCell>
                    <TableCell>
                      {row.visibility === 'public' || row.visibility === 'private' || row.visibility === 'link_only'
                        ? t(`article.visibilityes.${row.visibility}`)
                        : (row.visibility ?? '—')}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.viewCountTotal}</TableCell>
                    <TableCell>
                      <Link
                        href={`${routes.articles.path}/${row.articleId}`}
                        className="text-sm underline text-muted-foreground hover:text-foreground"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('article.views.ui.openAdmin')}
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {selectedArticleId && (
        <div className="flex flex-col gap-2">
          <Typography variant="Body/M/Semibold">{t('article.views.ui.revisionsHint')}</Typography>
          {detailLoading && (
            <Typography variant="Body/XS/Regular" className="text-muted-foreground">
              {t('article.ui.loading')}
            </Typography>
          )}
          {detail && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('article.views.ui.revisionTitle')}</TableHead>
                    <TableHead>{t('article.views.ui.publishedAt')}</TableHead>
                    <TableHead className="text-right">{t('article.views.ui.revisionViews')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={2} className="font-medium">
                      {t('article.views.ui.articleViews')} ({t('article.fields.slug')}: {detail.slug ?? '—'})
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">{detail.viewCountTotal}</TableCell>
                  </TableRow>
                  {detail.revisions.map((rev) => (
                    <TableRow key={rev.revisionId}>
                      <TableCell className="max-w-[240px] truncate">{rev.title ?? '—'}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {rev.publishedAt ? time(rev.publishedAt).format('DD/MM/YYYY HH:mm') : '—'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{rev.viewCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
