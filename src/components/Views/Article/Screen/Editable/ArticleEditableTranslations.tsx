'use client'

import { AxiosError } from 'axios'
import { FilePlus2, Languages, Link2, Link2Off, Send } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from 'react-query'

import { ArticleModel, ArticleStatus } from '~/api/article'
import { InputField } from '~/components/Fields'
import { AlertBlock, Button, Typography } from '~/components/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import {
  useArticleTranslationCreateMutation,
  useArticleTranslationLinkMutation,
  useArticleTranslationPublishBatchMutation,
  useArticleTranslationUnlinkMutation,
} from '~/query/article/mutation/useArticleTranslationMutations'
import { useUpdateArticleMutation } from '~/query/article/mutation/useUpdateArticleMutation'
import { ARTICLE_QUERY_KEY } from '~/query/article/query/useArticleQuery'
import { ARTICLE_TRANSLATION_SIBLINGS_QUERY_KEY, useArticleTranslationSiblingsQuery } from '~/query/article/query/useArticleTranslationSiblingsQuery'
import { cn } from '~/utils/cn'

type Props = {
  articleId: string
  article: ArticleModel | null | undefined
  /** Revision to duplicate (defaults to `article.revisionId` in the request when omitted). */
  sourceRevisionId?: string | null
}

const COMMON_LOCALE_TAGS = ['ar', 'de', 'en', 'en-GB', 'es', 'fr', 'it', 'ja', 'ko', 'pl', 'pt', 'pt-BR', 'ru', 'tr', 'uk', 'zh-Hans', 'zh-Hant']

export function ArticleEditableTranslations(props: Props) {
  const { articleId, article, sourceRevisionId: sourceRevisionIdProp } = props
  const t = useT()
  const router = useRouter()
  const { notify } = useNotify()
  const queryClient = useQueryClient()
  const { data, isLoading, refetch } = useArticleTranslationSiblingsQuery(articleId, Boolean(articleId))
  const { updateArticleMutation } = useUpdateArticleMutation()
  const linkMutation = useArticleTranslationLinkMutation()
  const unlinkMutation = useArticleTranslationUnlinkMutation()
  const publishBatchMutation = useArticleTranslationPublishBatchMutation()
  const createTranslationMutation = useArticleTranslationCreateMutation()

  const [otherArticleId, setOtherArticleId] = useState('')
  const [groupDraft, setGroupDraft] = useState(article?.translationGroupId ?? '')
  const [newTranslationLocale, setNewTranslationLocale] = useState('')
  const [newTranslationSlug, setNewTranslationSlug] = useState('')

  const siblings = useMemo(() => data?.siblings ?? [], [data?.siblings])
  const groupId = data?.translationGroupId ?? article?.translationGroupId ?? null

  useEffect(() => {
    queueMicrotask(() => {
      setGroupDraft(article?.translationGroupId ?? '')
    })
  }, [article?.translationGroupId])

  const handleSaveGroupOnly = useCallback(async () => {
    if (!article) {
      return
    }

    try {
      const translationGroupId = groupDraft.trim() || null

      await updateArticleMutation.mutateAsync({
        id: articleId,
        translationGroupId,
      })

      notify(t('article.ui.translations.savedGroupOnly'), 'success')
      void queryClient.invalidateQueries([ARTICLE_QUERY_KEY, articleId].join('-'))
      void queryClient.invalidateQueries([ARTICLE_TRANSLATION_SIBLINGS_QUERY_KEY, articleId].join('-'))
      await refetch()
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

        return
      }

      notify(t('errors.unknown'), 'destructive')
    }
  }, [article, articleId, groupDraft, notify, queryClient, refetch, t, updateArticleMutation])

  const handleLinkOther = useCallback(async () => {
    const trimmed = otherArticleId.trim()

    if (!trimmed || trimmed === articleId) {
      notify(t('article.ui.translations.linkOtherInvalid'), 'destructive')

      return
    }

    try {
      await linkMutation.mutateAsync({ articleIds: [articleId, trimmed], translationGroupId: groupDraft.trim() || null })
      setOtherArticleId('')
      notify(t('article.ui.translations.linked'), 'success')
      await refetch()
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

        return
      }

      notify(t('errors.unknown'), 'destructive')
    }
  }, [articleId, groupDraft, linkMutation, notify, otherArticleId, refetch, t])

  const handleUnlinkSelf = useCallback(async () => {
    try {
      await unlinkMutation.mutateAsync({ articleIds: [articleId] })
      setGroupDraft('')
      notify(t('article.ui.translations.unlinkedSelf'), 'success')
      await refetch()
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

        return
      }

      notify(t('errors.unknown'), 'destructive')
    }
  }, [articleId, notify, refetch, t, unlinkMutation])

  const handleUnlinkGroup = useCallback(async () => {
    const ids = siblings.map((s) => s.id)

    if (!ids.length) {
      return
    }

    try {
      await unlinkMutation.mutateAsync({ articleIds: ids })
      setGroupDraft('')
      notify(t('article.ui.translations.unlinkedGroup'), 'success')
      await refetch()
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

        return
      }

      notify(t('errors.unknown'), 'destructive')
    }
  }, [notify, refetch, siblings, t, unlinkMutation])

  const handlePublishAllDraftsInGroup = useCallback(async () => {
    const ids = [...new Set(siblings.map((s) => s.id))]

    if (!ids.includes(articleId)) {
      ids.push(articleId)
    }

    try {
      const res = await publishBatchMutation.mutateAsync({ articleIds: ids })
      notify(t('article.ui.translations.publishedBatch', { count: res.publishedIds.length }), 'success')
      window.location.reload()
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

        return
      }

      notify(t('errors.unknown'), 'destructive')
    }
  }, [articleId, notify, publishBatchMutation, siblings, t])

  const hasDraftInGroup = useMemo(() => {
    return siblings.some((s) => s.status === ArticleStatus.DRAFT) || article?.status === ArticleStatus.DRAFT
  }, [article?.status, siblings])

  const handleCreateTranslation = useCallback(async () => {
    try {
      const sourceRevisionId = sourceRevisionIdProp ?? article?.revisionId ?? undefined

      const res = await createTranslationMutation.mutateAsync({
        sourceArticleId: articleId,
        sourceRevisionId,
        locale: newTranslationLocale,
        slug: newTranslationSlug.trim() ? newTranslationSlug.trim().toLowerCase() : null,
      })

      setNewTranslationLocale('')
      setNewTranslationSlug('')
      notify(t('article.ui.translations.createdTranslation'), 'success')
      router.push(`/admin/articles/${res.article.id}?revisionId=${res.revisionId}&activeTab=content`)
    } catch (error) {
      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

        return
      }

      notify(t('errors.unknown'), 'destructive')
    }
  }, [article, articleId, createTranslationMutation, newTranslationLocale, newTranslationSlug, notify, router, sourceRevisionIdProp, t])

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4 bg-muted/30">
      <div className="flex flex-row items-center gap-2">
        <Languages className="size-5 shrink-0 text-muted-foreground" />
        <Typography variant="heading-3">{t('article.ui.translations.title')}</Typography>
      </div>

      <AlertBlock
        notify={{
          type: 'info',
          message: t('article.ui.translations.hint'),
        }}
      />

      <AlertBlock
        notify={{
          type: 'info',
          message: t('article.ui.translations.localeFromSeoTabHint'),
        }}
      />

      <AlertBlock
        notify={{
          type: 'warning',
          message: t('article.ui.translations.publishedClusterImpact'),
        }}
      />

      <div className="flex min-w-0 flex-col gap-2">
        <InputField
          name="translation-group-id"
          label={t('article.ui.translations.groupIdLabel')}
          hintText={t('article.ui.translations.groupIdHint')}
          value={groupDraft}
          onChange={(e) => setGroupDraft(e.target.value)}
          placeholder="UUID"
          classNames={{ input: 'font-mono text-sm' }}
        />
      </div>

      <Typography variant="Body/XS/Regular" className="text-muted-foreground">
        {t('article.ui.translations.unlinkActionsHelp')}
      </Typography>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="default" size="sm-md" onClick={() => void handleSaveGroupOnly()} disabled={updateArticleMutation.isLoading}>
          {t('article.ui.translations.saveGroupOnly')}
        </Button>
        {groupId ? (
          <>
            <Button type="button" variant="secondary" size="sm-md" onClick={() => void handleUnlinkSelf()} disabled={unlinkMutation.isLoading}>
              <Link2Off className="size-4" />
              {t('article.ui.translations.unlinkSelf')}
            </Button>
            {siblings.length > 1 ? (
              <div className="flex min-w-0 flex-col gap-1">
                <Button type="button" variant="destructive" size="sm-md" onClick={() => void handleUnlinkGroup()} disabled={unlinkMutation.isLoading}>
                  {t('article.ui.translations.unlinkWholeGroup')}
                </Button>
                <Typography variant="Body/XS/Regular" className="max-w-prose text-muted-foreground">
                  {t('article.ui.translations.unlinkWholeGroupHelp')}
                </Typography>
              </div>
            ) : null}
            {hasDraftInGroup ? (
              <Button
                type="button"
                variant="outline"
                size="sm-md"
                onClick={() => void handlePublishAllDraftsInGroup()}
                disabled={publishBatchMutation.isLoading}
              >
                <Send className="size-4" />
                {t('article.ui.translations.publishDraftsInGroup')}
              </Button>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-dashed border-border p-3">
        <Typography variant="Body/S/Semibold">{t('article.ui.translations.createSectionTitle')}</Typography>
        <AlertBlock
          notify={{
            type: 'info',
            message: t('article.ui.translations.createSectionHint'),
          }}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <InputField
              name="translation-new-locale"
              label={t('article.ui.translations.newTargetLocale')}
              hintText={t('article.ui.translations.localeHint')}
              value={newTranslationLocale}
              onChange={(e) => setNewTranslationLocale(e.target.value)}
              placeholder={t('article.ui.translations.newTargetLocalePlaceholder')}
              list="article-translation-common-locales"
            />
            <datalist id="article-translation-common-locales">
              {COMMON_LOCALE_TAGS.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </div>
          <InputField
            name="translation-new-slug"
            label={t('article.ui.translations.newSlugOptional')}
            hintText={t('article.ui.translations.newSlugPlaceholder')}
            value={newTranslationSlug}
            onChange={(e) => setNewTranslationSlug(e.target.value)}
            placeholder={t('article.ui.translations.newSlugPlaceholder')}
            classNames={{ input: 'font-mono text-sm' }}
          />
        </div>
        <Button
          type="button"
          variant="default"
          size="sm-md"
          className="w-fit gap-2"
          onClick={() => void handleCreateTranslation()}
          disabled={createTranslationMutation.isLoading || !newTranslationLocale.trim()}
        >
          <FilePlus2 className="size-4" />
          {createTranslationMutation.isLoading ? t('article.ui.translations.creatingTranslation') : t('article.ui.translations.createDraftTranslation')}
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
        <Typography variant="Body/S/Semibold">{t('article.ui.translations.linkAnotherTitle')}</Typography>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <InputField
              name="translation-link-other-id"
              label={t('article.ui.translations.otherArticleId')}
              value={otherArticleId}
              onChange={(e) => setOtherArticleId(e.target.value)}
              placeholder="ObjectId"
              classNames={{ input: 'font-mono text-sm' }}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm-md"
            onClick={() => void handleLinkOther()}
            disabled={linkMutation.isLoading}
            className="shrink-0 gap-2"
          >
            <Link2 className="size-4" />
            {t('article.ui.translations.linkButton')}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Typography variant="Body/S/Regular" className="text-muted-foreground">
          {t('article.ui.loading')}
        </Typography>
      ) : siblings.length === 0 ? (
        <Typography variant="Body/S/Regular" className="text-muted-foreground">
          {t('article.ui.translations.noGroupYet')}
        </Typography>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('article.ui.translations.colLocale')}</TableHead>
              <TableHead>{t('article.ui.translations.colTitle')}</TableHead>
              <TableHead>{t('article.fields.slug')}</TableHead>
              <TableHead>{t('article.fields.status')}</TableHead>
              <TableHead className="text-right">{t('article.ui.translations.colOpen')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {siblings.map((row) => (
              <TableRow key={row.id} className={cn(row.id === articleId && 'bg-muted/60')}>
                <TableCell>
                  <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium uppercase">{row.locale ?? '—'}</span>
                </TableCell>
                <TableCell className="max-w-[220px] truncate">{row.title ?? '—'}</TableCell>
                <TableCell className="max-w-[160px] truncate font-mono text-xs">{row.slug || '—'}</TableCell>
                <TableCell>{row.status ? t(`article.statuses.${row.status as 'draft' | 'published' | 'unpublished'}`) : '—'}</TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/articles/${row.id}`} className="text-primary underline underline-offset-2 text-sm">
                    {row.id === articleId ? t('article.ui.translations.youAreHere') : t('article.ui.translations.openEditor')}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
