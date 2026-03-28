'use client'

import { AxiosError } from 'axios'
import { HeadphonesIcon } from 'lucide-react'
import { useCallback } from 'react'
import { useQueryClient } from 'react-query'

import { ArticleModel } from '~/api/article'
import { MediaResourceType } from '~/api/media'
import { MediaUrlUploadField } from '~/components/Fields'
import { Button, Typography } from '~/components/ui'
import { useT } from '~/providers'
import { useNotify } from '~/providers/notify'
import { useArticleListenAudioGenerateMutation, useUpdateArticleMutation } from '~/query/article'
import { ARTICLE_QUERY_KEY } from '~/query/article/query/useArticleQuery'
import { cn } from '~/utils/cn'

export type ArticleAdminListenAudioControlsProps = {
  articleId: string
  article: ArticleModel | null | undefined
  activeRevisionId: string | null | undefined
  className?: string
}

export const ArticleAdminListenAudioControls = (props: ArticleAdminListenAudioControlsProps) => {
  const { articleId, article, activeRevisionId, className } = props
  const t = useT()
  const { notify } = useNotify()
  const queryClient = useQueryClient()
  const mutation = useArticleListenAudioGenerateMutation(articleId)
  const { updateArticleMutation } = useUpdateArticleMutation()

  const articleRevisionId = article?.revisionId ?? null
  const isHeadRevision = Boolean(articleRevisionId && activeRevisionId && activeRevisionId === articleRevisionId)
  const hasAudio = Boolean(article?.listenAudioAssetId)
  const isStale = Boolean(hasAudio && article?.listenAudioSourceRevisionId && articleRevisionId && article.listenAudioSourceRevisionId !== articleRevisionId)

  const listenValue = article?.listenAudioAssetId ? `/cdn/${article.listenAudioAssetId}` : ''
  const toolbarBusy = mutation.isLoading || updateArticleMutation.isLoading
  const fieldDisabled = !isHeadRevision || toolbarBusy

  const persistListenFields = useCallback(
    async (payload: Partial<Pick<ArticleModel, 'listenAudioAssetId' | 'listenAudioSourceRevisionId' | 'listenAudioGeneratedAt'>>) => {
      try {
        await updateArticleMutation.mutateAsync({ id: articleId, ...payload })
        void queryClient.invalidateQueries([ARTICLE_QUERY_KEY, articleId].join('-'))
      } catch (e) {
        const msg =
          e instanceof AxiosError && typeof e.response?.data?.message === 'string'
            ? e.response.data.message
            : e instanceof Error
              ? e.message
              : t('errors.unknown')

        notify(msg, 'destructive')
      }
    },
    [articleId, notify, queryClient, t, updateArticleMutation],
  )

  const onGenerate = useCallback(async () => {
    try {
      const result = await mutation.mutateAsync({})

      notify(t('article.ui.listenAudioGenerated'), 'success')

      if (result.textTruncated) {
        notify(t('article.ui.listenAudioTruncatedWarning'), 'info')
      }
    } catch (e) {
      const msg =
        e instanceof AxiosError && typeof e.response?.data?.message === 'string'
          ? e.response.data.message
          : e instanceof Error
            ? e.message
            : t('errors.unknown')

      notify(msg, 'destructive')
    }
  }, [mutation, notify, t])

  const genLabel = hasAudio ? t('article.ui.listenAudioRegenerate') : t('article.ui.listenAudioGenerate')

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {!isHeadRevision ? (
        <Typography variant="Body/XS/Regular" className="text-muted-foreground max-w-md">
          {t('article.ui.listenAudioWrongRevisionHint')}
        </Typography>
      ) : null}
      {isStale && isHeadRevision ? (
        <Typography variant="Body/XS/Regular" className="text-amber-700 dark:text-amber-400 max-w-xl">
          {t('article.ui.listenAudioStaleHint')}
        </Typography>
      ) : null}

      <MediaUrlUploadField
        label={t('article.ui.listenAudioFieldLabel')}
        value={listenValue}
        assetId={article?.listenAudioAssetId ?? null}
        articleRevisionId={articleRevisionId}
        disabled={fieldDisabled}
        toolbarBusy={toolbarBusy}
        urlInputReadOnly
        resourceType={MediaResourceType.AUDIO}
        variant="original"
        hintText={t('article.ui.listenAudioFieldHint')}
        renderToolbar={({ disabled: tbDisabled, isBusy, canRemove, openLibrary, pickLocalFile, remove }) => (
          <>
            <Button type="button" variant="secondary" size="sm-md" className="gap-2" disabled={tbDisabled} onClick={() => void onGenerate()}>
              <HeadphonesIcon className="size-4 shrink-0" aria-hidden />
              {mutation.isLoading ? t('article.ui.listenAudioGenerating') : genLabel}
            </Button>
            <Button type="button" variant="secondary" size="sm-md" disabled={tbDisabled || isBusy} onClick={openLibrary}>
              {t('media.ui.mediaLibrary')}
            </Button>
            <Button type="button" variant="secondary" size="sm-md" disabled={tbDisabled || isBusy} onClick={pickLocalFile}>
              {t('article.ui.listenAudioPickFile')}
            </Button>
            {canRemove ? (
              <Button type="button" variant="outline" size="sm-md" disabled={tbDisabled || isBusy} onClick={remove}>
                {t('common.remove')}
              </Button>
            ) : null}
          </>
        )}
        onChange={(next) => {
          if (next.removed) {
            void persistListenFields({
              listenAudioAssetId: null,
              listenAudioSourceRevisionId: null,
              listenAudioGeneratedAt: null,
            })

            return
          }

          if (next.assetId) {
            void persistListenFields({
              listenAudioAssetId: next.assetId,
              listenAudioSourceRevisionId: activeRevisionId ?? articleRevisionId,
              listenAudioGeneratedAt: new Date().toISOString(),
            })
          }
        }}
      />
    </div>
  )
}
