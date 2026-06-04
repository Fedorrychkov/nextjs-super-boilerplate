'use client'

import type { Editor } from '@tiptap/core'
import { AxiosError } from 'axios'
import debounce from 'lodash/debounce'
import { ActivityIcon, BotIcon, EyeIcon, FileTextIcon, InfoIcon, Languages, LockIcon, SearchIcon, SendIcon } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from 'react-query'

import { ArticleModel, ArticleStatus, ArticleVisibility } from '~/api/article'
import { ArticleRevisionMediaMetadata, ArticleRevisionMetadata, ArticleRevisionModel, ArticleRevisionStatus, SortOrder } from '~/api/article-revision'
import { MediaProvider, MediaResourceType } from '~/api/media'
import { Tab, TabsContainer } from '~/components/Blocks/Tabs/TabsContainer'
import { HorizontalContainer } from '~/components/Containers'
import { SpinnerScreen } from '~/components/Loaders'
import { AlertBlock, Button, Typography } from '~/components/ui'
import { routes } from '~/constants'
import type { TFunction } from '~/lib/i18n'
import { normalizeBcp47ArticleLocale } from '~/lib/seo/articleLanguage'
import { useT } from '~/providers'
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
import { ARTICLE_TRANSLATION_SIBLINGS_QUERY_KEY } from '~/query/article/query/useArticleTranslationSiblingsQuery'
import { cn } from '~/utils/cn'
import { jsonStringifySafety } from '~/utils/jsonSafe'
import { Logger } from '~/utils/logger'
import { time } from '~/utils/time'

import { ArticleAdminListenAudioControls } from './ArticleAdminListenAudioControls'
import { ArticleAiChatModal, isLlmUiEnabled } from './ArticleAiChatModal'
import { ArticleEditableContent, type ArticleEditableContentHandle } from './ArticleEditableContent'
import { ArticleEditablePreview, type ArticleEditablePreviewHandle, SaveForm } from './ArticleEditablePreview'
import { ArticleEditablePublication } from './ArticleEditablePublication'
import { ArticleEditableSeo, type ArticleEditableSeoHandle, ArticleEditableSeoSavePayload } from './ArticleEditableSeo'
import { ArticleEditableTranslations } from './ArticleEditableTranslations'
import { ArticleEditorLlmUsageChip } from './ArticleEditorLlmUsageChip'
import { getNextArticleEditorTabValue } from './articleEditorTabOrder'

const getSteps = (props: {
  article?: ArticleModel | null
  articleRevision?: ArticleRevisionModel | null
  onSavePreview?: (form: SaveForm) => void
  onPreview?: () => void
  onSaveSeo?: (payload: ArticleEditableSeoSavePayload) => void
  onUpdateContent?: (editor: Editor) => void
  isContentEnabled?: boolean
  isSeoEnabled?: boolean
  isDisabledEditing?: boolean
  t: TFunction
}): Tab[] => [
  {
    label: props.t('article.ui.previewInformation'),
    icon: <InfoIcon />,
    value: 'preview-information',
    children: (
      <ArticleEditablePreview
        btnLabel={!props?.article ? props.t('common.next') : props.t('common.saveChanges')}
        article={props.article}
        articleRevision={props.articleRevision}
        onSave={props.onSavePreview}
        isDisabled={props.isDisabledEditing}
      />
    ),
  },
  {
    label: props.t('article.ui.content'),
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
    label: props.t('article.ui.translations.tab'),
    icon: <Languages className="size-4 shrink-0" />,
    value: 'translations',
    isEnabled: props.isSeoEnabled,
    children: null,
  },
  {
    label: props.t('common.preview'),
    icon: <EyeIcon />,
    value: 'preview',
    onClick: props.onPreview,
    isEnabled: props.isSeoEnabled,
  },
  {
    label: props.t('article.ui.publication.tab'),
    icon: <SendIcon />,
    value: 'publication',
    isEnabled: props.isSeoEnabled,
    children: null,
  },
]

const logger = new Logger(['ArticleEditableEntry', '[src/components/Views/Article/Screen/Editable/ArticleEditableEntry.tsx]'])

export type ArticleEditableEntryProps = {
  articleId?: string | null
  className?: string
  revisionId?: string | null
  activeTab?: string | null
}

export const ArticleEditableEntry = (props: ArticleEditableEntryProps) => {
  const { articleId, revisionId, className = '', activeTab: activeTabProp } = props
  const [activeTab, setActiveTab] = useState<string | null>(activeTabProp ?? null)
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const seoEditorRef = useRef<ArticleEditableSeoHandle>(null)
  const previewEditorRef = useRef<ArticleEditablePreviewHandle>(null)
  const contentEditorRef = useRef<ArticleEditableContentHandle>(null)
  const stepsRef = useRef<Tab[]>([])
  const router = useRouter()
  const { notify } = useNotify()
  const queryClient = useQueryClient()
  const t = useT()

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
  const updateArticleRevisionMutateAsync = updateArticleRevisionMutation.mutateAsync

  const isGlobalLoading =
    (articleId && (isArticleLoading || !isArticleFetched)) ||
    (activeRevisionId && (isArticleRevisionLoading || isArticleRevisionsLoading || !isArticleRevisionFetched || !isArticleRevisionsFetched))

  const isDisabledEditing = articleRevision?.status === ArticleRevisionStatus.CONFIRMED

  const handleSavePreview = useCallback(
    async (form: SaveForm) => {
      try {
        if (isDisabledEditing) {
          notify(t('article.ui.youAreNotAllowedToEditThisArticle'), 'destructive')

          return
        }

        if (articleId) {
          notify(t('article.ui.updatingArticle'), 'info')

          await updateArticleMutation.mutateAsync({
            id: articleId,
            visibility: form.visibility,
            allowedRoles: form.allowedRoles,
            allowAiTraining: form.allowAiTraining,
          })

          notify(t('article.ui.articleUpdated'), 'success')

          queryClient.invalidateQueries([articleKey])
        }

        if (activeRevisionId) {
          notify(t('article.ui.updatingArticleRevision'), 'info')

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

          notify(t('article.ui.articleRevisionUpdated'), 'success')

          queryClient.invalidateQueries([articleRevisionKey])
        }

        if (!articleId) {
          notify(t('article.ui.creatingArticle'), 'info')
          const response = await createArticleMutation.mutateAsync({
            slug: form.slug,
            visibility: form.visibility,
            allowedRoles: form.allowedRoles,
            allowAiTraining: form.allowAiTraining !== false,
          })

          notify(t('article.ui.articleCreated'), 'success')

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

            notify(t('article.ui.draftRevisionCreated'), 'success')

            router.replace(`/admin/articles/${response.id}?revisionId=${revision.id}&activeTab=content`)

            return
          } else {
            notify(t('errors.unknown'), 'destructive')

            return
          }
        }

        setActiveTab('content')
      } catch (error) {
        logger.error(error)

        if (error instanceof AxiosError) {
          notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

          return
        }

        notify(t('errors.unknown'), 'destructive')

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
      t,
      queryClient,
      articleKey,
      articleRevisionKey,
      articleRevision,
    ],
  )

  const handleSaveSeo = useCallback(
    async (payload: ArticleEditableSeoSavePayload) => {
      if (isDisabledEditing) {
        notify(t('article.ui.youAreNotAllowedToEditThisArticle'), 'destructive')
        throw new Error('article_editing_disabled')
      }

      if (!activeRevisionId) {
        notify(t('errors.unknown'), 'destructive')
        throw new Error('article_no_active_revision')
      }

      try {
        notify(t('article.ui.updatingArticleRevisionSeo'), 'info')

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

        notify(t('article.ui.articleRevisionSeoUpdated'), 'success')

        queryClient.invalidateQueries([articleRevisionKey])

        const mergedSeo = mergedMetadata.seo ?? {}
        const langRaw = mergedSeo.language
        const nextLocale =
          normalizeBcp47ArticleLocale(langRaw != null ? String(langRaw) : undefined) ??
          (typeof langRaw === 'string' && langRaw.trim() ? langRaw.trim().toLowerCase() : null)

        if (articleId && article) {
          const prevLocale = article.locale?.trim().toLowerCase() ?? null
          const normalizedNext = nextLocale?.trim().toLowerCase() ?? null

          if (prevLocale !== normalizedNext) {
            await updateArticleMutation.mutateAsync({
              id: articleId,
              locale: normalizedNext,
            })
            queryClient.invalidateQueries([articleKey])
            void queryClient.invalidateQueries([ARTICLE_TRANSLATION_SIBLINGS_QUERY_KEY, articleId].join('-'))
          }
        }
      } catch (error) {
        logger.error(error)

        if (error instanceof AxiosError) {
          notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')
        } else {
          notify(t('errors.unknown'), 'destructive')
        }

        throw error
      }
    },
    [
      activeRevisionId,
      article,
      articleId,
      articleKey,
      articleRevision,
      isDisabledEditing,
      notify,
      queryClient,
      articleRevisionKey,
      t,
      updateArticleMutation,
      updateArticleRevisionMutation,
    ],
  )

  const handleAfterSeoSaveNavigate = useCallback((target: 'translations' | 'publication') => {
    setActiveTab(target)
  }, [])

  const handleContentNext = useCallback(() => {
    const next = getNextArticleEditorTabValue('content', stepsRef.current)

    if (next) {
      setActiveTab(next)
    }
  }, [])

  const handleUpdateContent = useCallback(
    async (editor: Editor) => {
      try {
        if (isDisabledEditing) {
          notify(t('article.ui.youAreNotAllowedToEditThisArticle'), 'destructive')

          return
        }

        if (activeRevisionId) {
          notify(t('article.ui.updatingArticleRevisionContent'), 'info')

          await updateArticleRevisionMutateAsync({
            id: activeRevisionId,
            content: jsonStringifySafety(editor.getJSON()),
          })

          notify(t('article.ui.articleRevisionContentUpdated'), 'success')
        }
      } catch (error) {
        logger.error(error)

        if (error instanceof AxiosError) {
          notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

          return
        }

        notify(t('errors.unknown'), 'destructive')
      }
    },
    [activeRevisionId, updateArticleRevisionMutateAsync, notify, isDisabledEditing, t],
  )

  const handleUpdateContentRef = useRef(handleUpdateContent)
  const debouncedSaveRef = useRef<ReturnType<typeof debounce<(editor: Editor) => void>> | null>(null)

  useEffect(() => {
    handleUpdateContentRef.current = handleUpdateContent
  }, [handleUpdateContent])

  useLayoutEffect(() => {
    debouncedSaveRef.current = debounce((editor: Editor) => {
      void handleUpdateContentRef.current(editor)
    }, 1000)

    return () => {
      debouncedSaveRef.current?.cancel()
    }
  }, [])

  const debouncedUpdateContent = useCallback((editor: Editor) => {
    debouncedSaveRef.current?.(editor)
  }, [])

  /** `getSteps` content tab is replaced below; placeholder avoids passing debounced callback into `getSteps` (eslint react-compiler false positive on ref). */
  const noopContentEditorUpdate = useCallback((_editor: Editor) => {}, [])

  const handlePreview = useCallback(() => {
    if (!article?.slug || !activeRevisionId) {
      return
    }

    window.open(`${routes.articlePreview.path?.replace(':slug', article?.slug ?? '')}?revisionId=${activeRevisionId}`, '_blank')
  }, [article, activeRevisionId])

  const steps = useMemo(() => {
    const rawSteps = getSteps({
      t,
      article,
      articleRevision,
      onSavePreview: handleSavePreview,
      onSaveSeo: handleSaveSeo,
      onUpdateContent: noopContentEditorUpdate,
      onPreview: handlePreview,
      isContentEnabled: !!article,
      isSeoEnabled: !!article,
      isDisabledEditing,
    })

    const stepsWithAiRefs = rawSteps.map((step) => {
      if (step.value === 'preview-information') {
        return {
          ...step,
          children: (
            <ArticleEditablePreview
              ref={previewEditorRef}
              btnLabel={!article ? t('common.next') : t('common.saveChanges')}
              article={article}
              articleRevision={articleRevision}
              onSave={handleSavePreview}
              isDisabled={isDisabledEditing}
            />
          ),
        }
      }

      if (step.value === 'seo') {
        return {
          ...step,
          children: (
            <ArticleEditableSeo
              ref={seoEditorRef}
              isDisabled={isDisabledEditing}
              articleRevision={articleRevision}
              article={article}
              onSave={handleSaveSeo}
              onAfterSeoSaveNavigate={handleAfterSeoSaveNavigate}
            />
          ),
        }
      }

      if (step.value === 'translations') {
        return {
          ...step,
          children:
            articleId && article ? <ArticleEditableTranslations articleId={articleId} article={article} sourceRevisionId={activeRevisionId ?? null} /> : null,
        }
      }

      if (step.value === 'publication') {
        return {
          ...step,
          children:
            articleId && article ? (
              <ArticleEditablePublication
                articleId={articleId}
                article={article}
                articleRevision={articleRevision}
                activeRevisionId={activeRevisionId ?? null}
                isDisabledEditing={isDisabledEditing}
              />
            ) : null,
        }
      }

      if (step.value === 'content') {
        return {
          ...step,
          children: (
            <ArticleEditableContent
              ref={contentEditorRef}
              isDisabled={isDisabledEditing}
              articleRevision={articleRevision}
              onUpdate={debouncedUpdateContent}
              onNext={handleContentNext}
            />
          ),
        }
      }

      return step
    })

    const filteredSteps = stepsWithAiRefs.filter((step) => {
      if (articleId && (step.value === 'seo' || step.value === 'translations') && (!article || !articleRevision)) {
        return false
      }

      if (articleId && step.value === 'publication' && !article) {
        return false
      }

      return true
    })

    return filteredSteps
  }, [
    t,
    isDisabledEditing,
    activeRevisionId,
    articleId,
    article,
    articleRevision,
    handlePreview,
    handleSavePreview,
    handleSaveSeo,
    handleAfterSeoSaveNavigate,
    handleContentNext,
    debouncedUpdateContent,
    noopContentEditorUpdate,
  ])

  useLayoutEffect(() => {
    stepsRef.current = steps
  }, [steps])

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

      notify(t('article.ui.newVersionCreated'), 'success')

      setActiveRevisionId(response.id)
      setActiveTab('preview-information')

      window.location.reload()
    } catch (error) {
      logger.error(error)

      if (error instanceof AxiosError) {
        notify(error.response?.data?.message ?? t('errors.unknown'), 'destructive')

        return
      }

      notify(t('errors.unknown'), 'destructive')
    }
  }, [t, articleId, lastPublishedRevision, activeRevisionId, article, articleRevision, createArticleRevisionMutation, notify])

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {isGlobalLoading ? (
        <SpinnerScreen />
      ) : (
        <>
          {articleRevisions?.list?.length ? (
            <HorizontalContainer className="border-0 shadow-none pl-0">
              {articleRevisions?.list?.map((item) => (
                <Button
                  key={item.id}
                  variant={item.id === activeRevisionId ? 'default' : 'secondary'}
                  size="sm"
                  className="flex flex-row gap-2 items-center mb-0"
                  onClick={() => setActiveRevisionId(item.id)}
                >
                  <Typography
                    variant="Body/S/Regular"
                    className={cn('whitespace-nowrap text-nowrap', {
                      'text-muted-foreground': item.id !== activeRevisionId,
                      'text-primary-foreground': item.id === activeRevisionId,
                    })}
                  >
                    {item.publishedAt ? time(item.publishedAt).format('DD.MM.YYYY HH:mm') : time(item.createdAt).format('DD.MM.YYYY HH:mm')}
                  </Typography>
                  {item?.status === ArticleRevisionStatus.CONFIRMED ? (
                    <LockIcon
                      className={cn(
                        'w-6 h-6 shrink-0 bg-green-500 text-white rounded-md p-1',
                        article?.revisionId === item.id ? 'bg-green-600' : 'bg-blue-500',
                      )}
                    />
                  ) : null}
                </Button>
              ))}
              {article?.slug && article?.visibility === ArticleVisibility.PUBLIC && article?.status === ArticleStatus.PUBLISHED && (
                <div className="flex flex-row gap-2 items-center justify-start">
                  <Link
                    href={`/admin/rum?pathname=/article/${article.slug}`}
                    target="_blank"
                    className="flex text-nowrap items-center gap-2 px-2 rounded-lg text-secondary-400"
                  >
                    <ActivityIcon className="md:w-4 md:h-4 w-2 h-2 shrink-0" /> {t('navigation.rumDashboard')}
                  </Link>
                  <Link
                    href={`/admin/ai-referrals?pathname=/article/${article.slug}`}
                    target="_blank"
                    className="flex text-nowrap items-center gap-2 px-2 rounded-lg text-secondary-400"
                  >
                    <BotIcon className="md:w-4 md:h-4 w-2 h-2 shrink-0" /> {t('navigation.aiReferralsDashboard')}
                  </Link>
                </div>
              )}
            </HorizontalContainer>
          ) : null}
          {isDisabledEditing && (
            <AlertBlock
              notify={{
                type: 'info',
                message: (
                  <div className="flex flex-col gap-2 items-start">
                    <Typography variant="Body/S/Regular" className="text-muted-foreground">
                      {t('article.ui.youAreNotAllowedToEditTheLastPublishedArticlePleaseStartTheNewVersion')}
                    </Typography>
                    {!isHasDraftRevision ? (
                      <Button variant="default" size="sm-md" onClick={handleStartNewVersion}>
                        {t('article.ui.startNewVersion')}
                      </Button>
                    ) : null}
                    <Typography variant="Body/S/Regular" className="text-muted-foreground">
                      {t('article.ui.orRepublishEarlyVersion')}
                    </Typography>
                  </div>
                ),
              }}
            />
          )}
          {isLlmUiEnabled() && articleId && activeRevisionId ? (
            <div className="flex flex-row flex-wrap items-center gap-x-3 gap-y-2">
              {articleRevision?.status === ArticleRevisionStatus.DRAFT ? (
                <Button type="button" variant="outline" size="sm-md" className="gap-2" onClick={() => setAiChatOpen(true)}>
                  <BotIcon className="size-4 shrink-0" />
                  {t('article.ui.aiAssistant')}
                </Button>
              ) : null}
              <ArticleEditorLlmUsageChip articleId={articleId} revisionId={activeRevisionId} enabled />
              <ArticleAiChatModal
                articleId={articleId}
                revisionId={activeRevisionId}
                articleRevision={articleRevision}
                open={aiChatOpen}
                onOpenChange={setAiChatOpen}
                seoEditorRef={seoEditorRef}
                previewEditorRef={previewEditorRef}
                contentEditorRef={contentEditorRef}
              />
            </div>
          ) : null}
          {articleId && activeRevisionId ? (
            <ArticleAdminListenAudioControls articleId={articleId} article={article} activeRevisionId={activeRevisionId} />
          ) : null}
          {articleRevisions?.list?.length ? (
            <>
              {articleRevisions?.list?.map((revision) => (
                <Fragment key={revision.id}>
                  {revision.id === activeRevisionId ? (
                    <TabsContainer searchMutable tabs={steps} mode="now" activeTab={finalActiveTab} currentTab={activeTab} onTabChange={setActiveTab} />
                  ) : null}
                </Fragment>
              ))}
            </>
          ) : (
            <TabsContainer searchMutable tabs={steps} mode="now" activeTab={finalActiveTab} currentTab={activeTab} onTabChange={setActiveTab} />
          )}
        </>
      )}
    </div>
  )
}
