'use client'

import { AxiosError } from 'axios'
import { ExternalLink, Send } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useMemo } from 'react'

import { ArticleModel, ArticleStatus } from '~/api/article'
import { ArticleRevisionModel, ArticleRevisionStatus } from '~/api/article-revision'
import { AlertBlock, Button, Typography } from '~/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { routes } from '~/constants'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import {
  useArticleTranslationPublishBatchMutation,
  useArticleTranslationRestorePublishedBatchMutation,
  useArticleTranslationUnpublishBatchMutation,
} from '~/query/article/mutation/useArticleTranslationMutations'
import { useUpdateArticleMutation } from '~/query/article/mutation/useUpdateArticleMutation'
import { useUpdateArticleRevisionMutation } from '~/query/article/mutation/useUpdateArticleRevisionMutation'
import { useArticleTranslationSiblingsQuery } from '~/query/article/query/useArticleTranslationSiblingsQuery'
import { Logger } from '~/utils/logger'
import { time } from '~/utils/time'

const logger = new Logger(['ArticleEditablePublication', '[ArticleEditablePublication.tsx]'])

export type ArticleEditablePublicationProps = {
  articleId: string
  article: ArticleModel
  articleRevision: ArticleRevisionModel | null | undefined
  activeRevisionId: string | null
  isDisabledEditing: boolean
}

function adminArticleEditorHref(id: string, revisionId: string | null | undefined) {
  const base = `${routes.articles.path}/${id}`
  const qs = new URLSearchParams()
  qs.set('activeTab', 'publication')

  if (revisionId) {
    qs.set('revisionId', revisionId)
  }
  const q = qs.toString()

  return q ? `${base}?${q}` : base
}

export function ArticleEditablePublication(props: ArticleEditablePublicationProps) {
  const { articleId, article, articleRevision, activeRevisionId, isDisabledEditing } = props
  const t = useT()
  const { notify } = useNotify()
  const { data: siblingsData, isLoading: siblingsLoading } = useArticleTranslationSiblingsQuery(articleId, true)
  const { updateArticleMutation } = useUpdateArticleMutation()
  const { updateArticleRevisionMutation } = useUpdateArticleRevisionMutation()
  const publishBatchMutation = useArticleTranslationPublishBatchMutation()
  const unpublishBatchMutation = useArticleTranslationUnpublishBatchMutation()
  const restoreBatchMutation = useArticleTranslationRestorePublishedBatchMutation()

  const siblings = useMemo(() => siblingsData?.siblings ?? [], [siblingsData?.siblings])
  const hasTranslationGroup = Boolean(siblingsData?.translationGroupId?.trim())

  const publishedIdsInGroup = useMemo(() => {
    const ids = new Set<string>()
    for (const s of siblings) {
      if (s.status === ArticleStatus.PUBLISHED) {
        ids.add(s.id)
      }
    }

    return [...ids]
  }, [siblings])

  const unpublishedIdsInGroup = useMemo(() => {
    const ids = new Set<string>()
    for (const s of siblings) {
      if (s.status === ArticleStatus.UNPUBLISHED) {
        ids.add(s.id)
      }
    }

    return [...ids]
  }, [siblings])

  const hasDraftInGroup = useMemo(() => {
    return siblings.some((s) => s.status === ArticleStatus.DRAFT)
  }, [siblings])

  const isRepublishing = article.revisionId !== articleRevision?.id
  const isRestoreUnpublishedLive =
    article.status === ArticleStatus.UNPUBLISHED && articleRevision?.status === ArticleRevisionStatus.CONFIRMED && article.revisionId === articleRevision?.id

  const canPublishOrRepublish = Boolean(activeRevisionId && articleRevision) && (!isDisabledEditing || isRepublishing || Boolean(isRestoreUnpublishedLive))

  const showPrimaryPublish = useMemo(() => {
    if (!activeRevisionId || !articleRevision) {
      return false
    }

    if (article.status === ArticleStatus.UNPUBLISHED && isRestoreUnpublishedLive) {
      return true
    }

    if (article.status === ArticleStatus.UNPUBLISHED && articleRevision.status === ArticleRevisionStatus.DRAFT) {
      return true
    }

    if (article.status === ArticleStatus.UNPUBLISHED && articleRevision.status === ArticleRevisionStatus.CONFIRMED && article.revisionId !== activeRevisionId) {
      return true
    }

    if (article.status === ArticleStatus.PUBLISHED && articleRevision.status === ArticleRevisionStatus.DRAFT) {
      return true
    }

    if (article.status === ArticleStatus.PUBLISHED && articleRevision.status === ArticleRevisionStatus.CONFIRMED && article.revisionId !== activeRevisionId) {
      return true
    }

    if (article.status === ArticleStatus.DRAFT && articleRevision.status === ArticleRevisionStatus.DRAFT) {
      return true
    }

    return false
  }, [activeRevisionId, article.revisionId, article.status, articleRevision, isRestoreUnpublishedLive])

  const primaryPublishLabel = useMemo(() => {
    if (isRestoreUnpublishedLive) {
      return t('article.ui.publication.restorePublish')
    }

    if (article.status === ArticleStatus.PUBLISHED && article.revisionId !== activeRevisionId && articleRevision?.status === ArticleRevisionStatus.CONFIRMED) {
      return t('article.ui.publication.republish')
    }

    return t('article.ui.publication.publishLive')
  }, [activeRevisionId, article.revisionId, article.status, articleRevision?.status, isRestoreUnpublishedLive, t])

  const showRestoreLiveSnapshot =
    article.status === ArticleStatus.UNPUBLISHED && Boolean(article.revisionId) && !isRestoreUnpublishedLive && Boolean(activeRevisionId && articleRevision)

  const handlePublishFlow = useCallback(async () => {
    try {
      if (!activeRevisionId || !articleRevision) {
        notify(t('article.ui.publication.needRevisionBody'), 'destructive')

        return
      }

      if (isDisabledEditing && !isRepublishing && !isRestoreUnpublishedLive) {
        notify(t('article.ui.youAreNotAllowedToEditThisArticle'), 'destructive')

        return
      }

      if (isRestoreUnpublishedLive) {
        notify(t('article.ui.publishingArticle'), 'info')
        await restoreBatchMutation.mutateAsync({ articleIds: [articleId] })
        notify(t('article.ui.articlePublished'), 'success')
        window.location.reload()

        return
      }

      notify(t('article.ui.publishingArticle'), 'info')

      await updateArticleMutation.mutateAsync({
        id: articleId,
        revisionId: activeRevisionId,
        status: ArticleStatus.PUBLISHED,
        version: (article.version ?? 0) + 1,
      })

      await updateArticleRevisionMutation.mutateAsync({
        id: activeRevisionId,
        status: ArticleRevisionStatus.CONFIRMED,
        publishedAt: time().toISOString(),
      })

      notify(t('article.ui.articlePublished'), 'success')
      window.location.reload()
    } catch (error) {
      logger.error(error)

      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

        return
      }
      notify(t('errors.unknown'), 'destructive')
    }
  }, [
    activeRevisionId,
    article.version,
    articleId,
    articleRevision,
    isDisabledEditing,
    isRepublishing,
    isRestoreUnpublishedLive,
    notify,
    restoreBatchMutation,
    t,
    updateArticleMutation,
    updateArticleRevisionMutation,
  ])

  const handleRestoreLiveSnapshot = useCallback(async () => {
    try {
      notify(t('article.ui.publishingArticle'), 'info')
      await restoreBatchMutation.mutateAsync({ articleIds: [articleId] })
      notify(t('article.ui.articlePublished'), 'success')
      window.location.reload()
    } catch (error) {
      logger.error(error)

      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

        return
      }
      notify(t('errors.unknown'), 'destructive')
    }
  }, [articleId, notify, restoreBatchMutation, t])

  const handleUnpublishOne = useCallback(async () => {
    try {
      notify(t('article.ui.publication.unpublishing'), 'info')
      await updateArticleMutation.mutateAsync({ id: articleId, status: ArticleStatus.UNPUBLISHED })
      notify(t('article.ui.publication.unpublished'), 'success')
      window.location.reload()
    } catch (error) {
      logger.error(error)

      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

        return
      }
      notify(t('errors.unknown'), 'destructive')
    }
  }, [articleId, notify, t, updateArticleMutation])

  const handleUnpublishAllPublished = useCallback(async () => {
    if (publishedIdsInGroup.length === 0) {
      return
    }
    try {
      notify(t('article.ui.publication.unpublishing'), 'info')
      const res = await unpublishBatchMutation.mutateAsync({ articleIds: publishedIdsInGroup })
      notify(t('article.ui.publication.unpublishedBatch', { count: res.unpublishedIds.length }), 'success')
      window.location.reload()
    } catch (error) {
      logger.error(error)

      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

        return
      }
      notify(t('errors.unknown'), 'destructive')
    }
  }, [notify, publishedIdsInGroup, t, unpublishBatchMutation])

  const handleRestoreAll = useCallback(async () => {
    if (unpublishedIdsInGroup.length === 0) {
      return
    }
    try {
      notify(t('article.ui.publishingArticle'), 'info')
      const res = await restoreBatchMutation.mutateAsync({ articleIds: unpublishedIdsInGroup })
      notify(t('article.ui.publication.restoredBatch', { count: res.restoredIds.length }), 'success')
      window.location.reload()
    } catch (error) {
      logger.error(error)

      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

        return
      }
      notify(t('errors.unknown'), 'destructive')
    }
  }, [notify, restoreBatchMutation, t, unpublishedIdsInGroup])

  const handlePublishAllDraftsInGroup = useCallback(async () => {
    const ids = [...new Set(siblings.map((s) => s.id))]
    try {
      notify(t('article.ui.publishingArticle'), 'info')
      const res = await publishBatchMutation.mutateAsync({ articleIds: ids })
      notify(t('article.ui.translations.publishedBatch', { count: res.publishedIds.length }), 'success')
      window.location.reload()
    } catch (error) {
      logger.error(error)

      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

        return
      }
      notify(t('errors.unknown'), 'destructive')
    }
  }, [notify, publishBatchMutation, siblings, t])

  const busy =
    updateArticleMutation.isLoading ||
    updateArticleRevisionMutation.isLoading ||
    publishBatchMutation.isLoading ||
    unpublishBatchMutation.isLoading ||
    restoreBatchMutation.isLoading

  const articleStatusLabel =
    article.status === ArticleStatus.PUBLISHED
      ? t('article.ui.publication.statusPublished')
      : article.status === ArticleStatus.UNPUBLISHED
        ? t('article.ui.publication.statusUnpublished')
        : t('article.ui.publication.statusDraft')

  return (
    <div className="flex flex-col gap-6 rounded-lg border border-border p-4 bg-muted/30">
      <div className="flex flex-row items-center gap-2">
        <Send className="size-5 shrink-0 text-muted-foreground" />
        <Typography variant="heading-3">{t('article.ui.publication.title')}</Typography>
      </div>

      <AlertBlock
        notify={{
          type: 'info',
          message: t('article.ui.publication.intro'),
        }}
      />

      <div className="flex flex-col gap-1">
        <Typography variant="Body/S/Semibold">{t('article.ui.publication.articleStatusLabel', { status: articleStatusLabel })}</Typography>
        {articleRevision ? (
          <Typography variant="Body/S/Regular" className="text-muted-foreground">
            {t('article.ui.publication.revisionInEditor')}: {articleRevision.status} ({activeRevisionId ?? '—'})
          </Typography>
        ) : (
          <Typography variant="Body/S/Regular" className="text-muted-foreground">
            {t('article.ui.publication.needRevisionBody')}
          </Typography>
        )}
      </div>

      {hasTranslationGroup ? (
        <div className="flex flex-col gap-2">
          <Typography variant="Body/S/Semibold">{t('article.ui.publication.groupTitle')}</Typography>
          {siblingsLoading ? (
            <Typography variant="Body/S/Regular">{t('common.loading')}</Typography>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('article.ui.publication.colLocale')}</TableHead>
                  <TableHead>{t('article.ui.publication.colTitle')}</TableHead>
                  <TableHead>{t('article.ui.publication.colArticleStatus')}</TableHead>
                  <TableHead className="text-right">{t('article.ui.publication.colOpen')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {siblings.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.locale ?? '—'}</TableCell>
                    <TableCell>{row.title ?? row.slug}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={adminArticleEditorHref(row.id, row.revisionId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="size-4 shrink-0" />
                        {row.id === articleId ? t('article.ui.publication.youAreHere') : t('article.ui.publication.openEditor')}
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <Typography variant="Body/S/Semibold">{t('article.ui.publication.actionsTitle')}</Typography>
        <div className="flex flex-col gap-2 flex-wrap sm:flex-row sm:items-center">
          {showPrimaryPublish && canPublishOrRepublish ? (
            <Button type="button" variant="default" size="sm-md" disabled={busy} onClick={() => void handlePublishFlow()}>
              {primaryPublishLabel}
            </Button>
          ) : null}

          {showRestoreLiveSnapshot ? (
            <Button type="button" variant="secondary" size="sm-md" disabled={busy} onClick={() => void handleRestoreLiveSnapshot()}>
              {t('article.ui.publication.restoreLiveSnapshot')}
            </Button>
          ) : null}

          {hasTranslationGroup && hasDraftInGroup ? (
            <Button type="button" variant="secondary" size="sm-md" disabled={busy} onClick={() => void handlePublishAllDraftsInGroup()}>
              {t('article.ui.publication.publishDraftsInGroup')}
            </Button>
          ) : null}

          {article.status === ArticleStatus.PUBLISHED ? (
            <Button type="button" variant="outline" size="sm-md" disabled={busy} onClick={() => void handleUnpublishOne()}>
              {t('article.ui.publication.unpublish')}
            </Button>
          ) : null}

          {hasTranslationGroup && publishedIdsInGroup.length > 1 ? (
            <Button type="button" variant="destructive" size="sm-md" disabled={busy} onClick={() => void handleUnpublishAllPublished()}>
              {t('article.ui.publication.unpublishAll')}
            </Button>
          ) : null}

          {hasTranslationGroup && unpublishedIdsInGroup.length > 1 ? (
            <Button type="button" variant="secondary" size="sm-md" disabled={busy} onClick={() => void handleRestoreAll()}>
              {t('article.ui.publication.restoreAll')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
