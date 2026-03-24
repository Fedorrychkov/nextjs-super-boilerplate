'use client'

import type { Editor } from '@tiptap/core'
import { AxiosError } from 'axios'
import debounce from 'lodash/debounce'
import { EyeIcon, FileTextIcon, InfoIcon, LockIcon, SearchIcon, SendIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from 'react-query'

import { ArticleModel, ArticleStatus } from '~/api/article'
import { ArticleRevisionMediaMetadata, ArticleRevisionMetadata, ArticleRevisionModel, ArticleRevisionStatus, SortOrder } from '~/api/article-revision'
import { MediaProvider, MediaResourceType } from '~/api/media'
import { Tab, TabsContainer } from '~/components/Blocks/Tabs/TabsContainer'
import { SpinnerScreen } from '~/components/Loaders'
import { AlertBlock, Button, Typography } from '~/components/ui'
import { useNotify } from '~/providers/notify'
import {
  useArticleQuery,
  useArticleRevisionQuery,
  useArticlesRevisionListQuery,
  useCreateArticleMutation,
  useCreateArticleRevisionMutation,
  useUpdateArticleMutation,
  useUpdateArticleRevisionMutation,
} from '~/query/article'
import { cn } from '~/utils/cn'
import { jsonStringifySafety } from '~/utils/jsonSafe'
import { Logger } from '~/utils/logger'
import { time } from '~/utils/time'

import { ArticleEditableContent } from './ArticleEditableContent'
import { ArticleEditablePreview, SaveForm } from './ArticleEditablePreview'
import { ArticleEditablePublish } from './ArticleEditablePublish'
import { ArticleEditableSeo, ArticleEditableSeoSavePayload } from './ArticleEditableSeo'

const getSteps = (props: {
  article?: ArticleModel | null
  articleRevision?: ArticleRevisionModel | null
  onSavePreview?: (form: SaveForm) => void
  onPreview?: () => void
  onSaveSeo?: (payload: ArticleEditableSeoSavePayload) => void
  onUpdateContent?: (editor: Editor) => void
  isContentEnabled?: boolean
  isSeoEnabled?: boolean
  isPublishEnabled?: boolean
  publishLabel?: string
  isDisabledEditing?: boolean
  onPublish?: () => void
}): Tab[] => [
  {
    label: 'Preview information',
    icon: <InfoIcon />,
    value: 'preview-information',
    children: (
      <ArticleEditablePreview
        btnLabel={!props?.article ? 'Next' : 'Save Changes'}
        article={props.article}
        articleRevision={props.articleRevision}
        onSave={props.onSavePreview}
        isDisabled={props.isDisabledEditing}
      />
    ),
  },
  {
    label: 'Content',
    icon: <FileTextIcon />,
    value: 'content',
    isEnabled: props.isContentEnabled,
    children: <ArticleEditableContent isDisabled={props.isDisabledEditing} articleRevision={props.articleRevision} onUpdate={props.onUpdateContent} />,
  },
  {
    label: 'SEO',
    icon: <SearchIcon />,
    value: 'seo',
    isEnabled: props.isSeoEnabled,
    children: (
      <ArticleEditableSeo isDisabled={props.isDisabledEditing} articleRevision={props.articleRevision} article={props.article} onSave={props.onSaveSeo} />
    ),
  },
  {
    label: 'Preview',
    icon: <EyeIcon />,
    value: 'preview',
    onClick: props.onPreview,
    isEnabled: props.isSeoEnabled,
  },
  {
    label: props.publishLabel ?? 'Publish',
    icon: <SendIcon />,
    value: 'publish',
    onClick: props.onPublish,
    isEnabled: props.isPublishEnabled,
    children: <ArticleEditablePublish btnLabel={props.publishLabel} article={props.article} articleRevision={props.articleRevision} onSave={props.onPublish} />,
  },
]

const logger = new Logger(['ArticleEditableEntry', '[src/components/Views/Article/Screen/Editable/ArticleEditableEntry.tsx]'])

type Props = {
  articleId?: string | null
  className?: string
  revisionId?: string | null
  activeTab?: string | null
}

export const ArticleEditableEntry = (props: Props) => {
  const { articleId, revisionId, className = '', activeTab: activeTabProp } = props
  const [activeTab, setActiveTab] = useState<string | null>(activeTabProp ?? null)
  const router = useRouter()
  const { notify } = useNotify()
  const queryClient = useQueryClient()

  const [activeRevisionId, setActiveRevisionId] = useState<string | null | undefined>(revisionId)

  const articleQueryEnabled = Boolean(articleId)
  const {
    data: article,
    isLoading: isArticleLoading,
    isFetched: isArticleFetched,
    key: articleKey,
  } = useArticleQuery(articleId ?? '', articleQueryEnabled, (data) => {
    if (!activeRevisionId && data.revisionId) {
      setActiveRevisionId(data.revisionId)
    }
  })

  const revisionQueryEnabled = Boolean(activeRevisionId)
  const {
    data: articleRevision,
    isLoading: isArticleRevisionLoading,
    isFetched: isArticleRevisionFetched,
    key: articleRevisionKey,
  } = useArticleRevisionQuery(activeRevisionId ?? '', revisionQueryEnabled)

  const {
    data: articleRevisions,
    isLoading: isArticleRevisionsLoading,
    isFetched: isArticleRevisionsFetched,
  } = useArticlesRevisionListQuery({ articleId: articleId ?? '', limit: 5, sortOrder: SortOrder.desc }, articleQueryEnabled && !!article, (data) => {
    const [last] = data.list

    if (last && !activeRevisionId) {
      setActiveRevisionId(last.id)
    }
  })

  const { createArticleMutation } = useCreateArticleMutation()
  const { createArticleRevisionMutation } = useCreateArticleRevisionMutation()
  const { updateArticleMutation } = useUpdateArticleMutation()
  const { updateArticleRevisionMutation } = useUpdateArticleRevisionMutation()

  const isGlobalLoading =
    (articleId && (isArticleLoading || !isArticleFetched)) ||
    (activeRevisionId && (isArticleRevisionLoading || isArticleRevisionsLoading || !isArticleRevisionFetched || !isArticleRevisionsFetched))

  const isDisabledEditing = articleRevision?.status === ArticleRevisionStatus.CONFIRMED

  const handleSavePreview = useCallback(
    async (form: SaveForm) => {
      try {
        if (isDisabledEditing) {
          notify('You are not allowed to edit this article', 'destructive')

          return
        }

        if (articleId) {
          notify('Updating article...', 'info')

          await updateArticleMutation.mutateAsync({
            id: articleId,
            visibility: form.visibility,
            allowedRoles: form.allowedRoles,
          })

          notify('Article updated', 'success')

          queryClient.invalidateQueries([articleKey])
        }

        if (activeRevisionId) {
          notify('Updating article revision...', 'info')

          const currentMetadata = (articleRevision?.metadata as ArticleRevisionMetadata | undefined) ?? {}
          const nextMedia: ArticleRevisionMediaMetadata = {
            ...(currentMetadata.media ?? {}),
            thumbnail: form.thumbnailAssetId
              ? {
                  assetId: form.thumbnailAssetId,
                  provider: MediaProvider.UPLOADCARE,
                  resourceType: MediaResourceType.IMAGE,
                  url: form.thumbnailUrl ?? null,
                }
              : null,
          }

          await updateArticleRevisionMutation.mutateAsync({
            id: activeRevisionId,
            thumbnailUrl: form.thumbnailUrl,
            title: form.title,
            description: form.description,
            metadata: {
              ...currentMetadata,
              media: nextMedia,
            },
          })

          notify('Article revision updated', 'success')

          queryClient.invalidateQueries([articleRevisionKey])
        }

        if (!articleId) {
          notify('Creating article...', 'info')
          const response = await createArticleMutation.mutateAsync({
            slug: form.slug,
            visibility: form.visibility,
            allowedRoles: form.allowedRoles,
          })

          notify('Article created', 'success')

          if (response.id) {
            const revision = await createArticleRevisionMutation.mutateAsync({
              articleId: response.id,
              thumbnailUrl: form.thumbnailUrl,
              title: form.title,
              description: form.description,
              metadata: {
                media: {
                  thumbnail: form.thumbnailAssetId
                    ? {
                        assetId: form.thumbnailAssetId,
                        provider: 'uploadcare',
                        resourceType: 'image',
                        url: form.thumbnailUrl ?? null,
                      }
                    : null,
                },
              },
            })

            notify('Draft revision created', 'success')

            router.replace(`/admin/articles/${response.id}?revisionId=${revision.id}&activeTab=content`)

            return
          } else {
            notify('Something went wrong', 'destructive')

            return
          }
        }

        setActiveTab('content')
      } catch (error) {
        logger.error(error)

        if (error instanceof AxiosError) {
          notify(error.response?.data?.message ?? 'Something went wrong', 'destructive')

          return
        }

        notify('Something went wrong', 'destructive')

        return
      }
    },
    [
      isDisabledEditing,
      activeRevisionId,
      articleId,
      createArticleMutation,
      createArticleRevisionMutation,
      updateArticleMutation,
      updateArticleRevisionMutation,
      router,
      notify,
      queryClient,
      articleKey,
      articleRevisionKey,
      articleRevision,
    ],
  )

  const handleSaveSeo = useCallback(
    async (payload: ArticleEditableSeoSavePayload) => {
      try {
        if (isDisabledEditing) {
          notify('You are not allowed to edit this article', 'destructive')

          return
        }

        if (activeRevisionId) {
          notify('Updating article revision SEO...', 'info')

          const currentMetadata = (articleRevision?.metadata as ArticleRevisionMetadata | undefined) ?? {}
          const mergedMetadata: ArticleRevisionMetadata = {
            ...currentMetadata,
            ...payload.metadata,
            seo: {
              ...(currentMetadata.seo ?? {}),
              ...(payload.metadata.seo ?? {}),
            },
            media: {
              ...(currentMetadata.media ?? {}),
              ...(payload.metadata.media ?? {}),
            },
          }

          await updateArticleRevisionMutation.mutateAsync({
            id: activeRevisionId,
            metadata: mergedMetadata,
          })

          notify('Article revision SEO updated', 'success')

          queryClient.invalidateQueries([articleRevisionKey])
        }
      } catch (error) {
        logger.error(error)

        if (error instanceof AxiosError) {
          notify(error.response?.data?.message ?? 'Something went wrong', 'destructive')

          return
        }

        notify('Something went wrong', 'destructive')
      }
    },
    [activeRevisionId, articleRevision, updateArticleRevisionMutation, notify, queryClient, articleRevisionKey, isDisabledEditing],
  )

  const handleUpdateContent = useCallback(
    async (editor: Editor) => {
      try {
        if (isDisabledEditing) {
          notify('You are not allowed to edit this article', 'destructive')

          return
        }

        logger.info('Updating article revision content...', { content: editor.getJSON() })

        if (activeRevisionId) {
          notify('Updating article revision content...', 'info')

          await updateArticleRevisionMutation.mutateAsync({
            id: activeRevisionId,
            content: jsonStringifySafety(editor.getJSON()),
          })

          notify('Article revision content updated', 'success')
        }
      } catch (error) {
        logger.error(error)

        if (error instanceof AxiosError) {
          notify(error.response?.data?.message ?? 'Something went wrong', 'destructive')

          return
        }

        notify('Something went wrong', 'destructive')
      }
    },
    [activeRevisionId, updateArticleRevisionMutation, notify, isDisabledEditing],
  )

  const handlePreview = useCallback(() => {
    if (!article?.slug || !activeRevisionId) {
      return
    }

    window.open(`/preview/${article?.slug}?revisionId=${activeRevisionId}`, '_blank')
  }, [article, activeRevisionId])

  const handlePublish = useCallback(async () => {
    try {
      const isRepublishing = article?.revisionId !== articleRevision?.id

      if (isDisabledEditing && !isRepublishing) {
        notify('You are not allowed to edit this article', 'destructive')

        return
      }

      if (!articleId || !activeRevisionId || !article || !articleRevision) {
        return
      }

      notify('Publishing article...', 'info')

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

      notify('Article published', 'success')

      window.location.reload()
    } catch (error) {
      logger.error(error)
    }
  }, [isDisabledEditing, article, articleId, activeRevisionId, articleRevision, updateArticleMutation, updateArticleRevisionMutation, notify])

  const steps = useMemo(() => {
    const steps = getSteps({
      article,
      articleRevision,
      onSavePreview: handleSavePreview,
      onSaveSeo: handleSaveSeo,
      onUpdateContent: debounce(handleUpdateContent, 1000),
      onPreview: handlePreview,
      isContentEnabled: !!article,
      isSeoEnabled: !!article,
      isPublishEnabled:
        articleRevision?.status === ArticleRevisionStatus.DRAFT ||
        (articleRevision?.status === ArticleRevisionStatus.CONFIRMED && article?.revisionId !== articleRevision?.id),
      publishLabel: articleRevision?.status === ArticleRevisionStatus.DRAFT ? 'Publish' : 'Republish',
      onPublish: handlePublish,
      isDisabledEditing,
    })

    const filteredSteps = steps.filter((step) => {
      if (articleId && step.value === 'seo' && (!article || !articleRevision)) {
        return false
      }

      return true
    })

    return filteredSteps
  }, [isDisabledEditing, articleId, article, articleRevision, handlePublish, handlePreview, handleSavePreview, handleSaveSeo, handleUpdateContent])

  const finalActiveTab = useMemo(() => {
    const isTabValid = steps.some((step) => step.value === activeTab)

    if (isTabValid) {
      return activeTab
    }

    return steps?.[0]?.value ?? ''
  }, [activeTab, steps])

  const isHasDraftRevision = useMemo(() => {
    return articleRevisions?.list?.some((item) => item.status === ArticleRevisionStatus.DRAFT)
  }, [articleRevisions])

  const lastPublishedRevision = useMemo(() => {
    return articleRevisions?.list?.find((item) => item.status === ArticleRevisionStatus.CONFIRMED)
  }, [articleRevisions?.list])

  const handleStartNewVersion = useCallback(async () => {
    if (!articleId || !activeRevisionId || !article || !articleRevision) {
      return
    }

    try {
      const response = await createArticleRevisionMutation.mutateAsync({
        articleId: articleId,
        metadata: lastPublishedRevision?.metadata ?? {},
        thumbnailUrl: lastPublishedRevision?.thumbnailUrl ?? '',
        title: lastPublishedRevision?.title ?? '',
        description: lastPublishedRevision?.description ?? '',
        content: lastPublishedRevision?.content ?? '',
        status: ArticleRevisionStatus.DRAFT,
        createdAt: null,
        updatedAt: null,
        publishedAt: null,
      })

      notify('New version created', 'success')

      setActiveRevisionId(response.id)
      setActiveTab('preview-information')

      window.location.reload()
    } catch (error) {
      logger.error(error)

      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? 'Something went wrong', 'destructive')

        return
      }

      notify('Something went wrong', 'destructive')
    }
  }, [articleId, lastPublishedRevision, activeRevisionId, article, articleRevision, createArticleRevisionMutation, notify])

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {isGlobalLoading ? (
        <SpinnerScreen />
      ) : (
        <>
          {articleRevisions?.list?.length ? (
            <div className="flex flex-row gap-2">
              {articleRevisions?.list?.map((item) => (
                <Button
                  key={item.id}
                  variant={item.id === activeRevisionId ? 'default' : 'secondary'}
                  size="sm-md"
                  className="flex flex-row gap-2 items-center"
                  onClick={() => setActiveRevisionId(item.id)}
                >
                  <Typography
                    variant="Body/S/Regular"
                    className={cn('whitespace-nowrap text-nowrap', {
                      'text-neutral-1000': item.id !== activeRevisionId,
                      'text-neutral': item.id === activeRevisionId,
                    })}
                  >
                    {item.publishedAt ? time(item.publishedAt).format('DD.MM.YYYY HH:mm') : time(item.createdAt).format('DD.MM.YYYY HH:mm')}
                  </Typography>
                  {item?.status === ArticleRevisionStatus.CONFIRMED ? <LockIcon className="w-6 h-6 shrink-0 bg-green-500 text-white rounded-md p-1" /> : null}
                </Button>
              ))}
            </div>
          ) : null}
          {isDisabledEditing && (
            <AlertBlock
              notify={{
                type: 'info',
                message: (
                  <div className="flex flex-col gap-2 items-start">
                    <Typography variant="Body/S/Regular" className="whitespace-nowrap text-nowrap text-neutral-1000">
                      You are not allowed to edit the last published article. Please start the new version
                    </Typography>
                    {!isHasDraftRevision ? (
                      <Button variant="default" size="sm-md" onClick={handleStartNewVersion}>
                        Start new version
                      </Button>
                    ) : null}
                    <Typography variant="Body/S/Regular" className="whitespace-nowrap text-nowrap text-neutral-1000">
                      or republish early version
                    </Typography>
                  </div>
                ),
              }}
            />
          )}
          <TabsContainer searchMutable tabs={steps} activeTab={finalActiveTab} currentTab={activeTab} onTabChange={setActiveTab} />
        </>
      )}
    </div>
  )
}
