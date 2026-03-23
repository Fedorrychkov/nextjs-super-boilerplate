'use client'

import type { Editor } from '@tiptap/core'
import { AxiosError } from 'axios'
import debounce from 'lodash/debounce'
import { EyeIcon, FileTextIcon, InfoIcon, SearchIcon, SendIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState } from 'react'
import { useQueryClient } from 'react-query'

import { ArticleModel, ArticleStatus } from '~/api/article'
import { ArticleRevisionModel, ArticleRevisionStatus, SortOrder } from '~/api/article-revision'
import { Tab, TabsContainer } from '~/components/Blocks/Tabs/TabsContainer'
import { SpinnerScreen } from '~/components/Loaders'
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
      />
    ),
  },
  {
    label: 'Content',
    icon: <FileTextIcon />,
    value: 'content',
    isEnabled: props.isContentEnabled,
    children: <ArticleEditableContent articleRevision={props.articleRevision} onUpdate={props.onUpdateContent} />,
  },
  {
    label: 'SEO',
    icon: <SearchIcon />,
    value: 'seo',
    isEnabled: props.isSeoEnabled,
    children: <ArticleEditableSeo articleRevision={props.articleRevision} article={props.article} onSave={props.onSaveSeo} />,
  },
  {
    label: 'Preview',
    icon: <EyeIcon />,
    value: 'preview',
    onClick: props.onPreview,
    isEnabled: props.isSeoEnabled,
  },
  {
    label: 'Publish',
    icon: <SendIcon />,
    value: 'publish',
    onClick: props.onPublish,
    isEnabled: props.isPublishEnabled,
    children: <ArticleEditablePublish article={props.article} articleRevision={props.articleRevision} onSave={props.onPublish} />,
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

  const handleSavePreview = useCallback(
    async (form: SaveForm) => {
      try {
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

          await updateArticleRevisionMutation.mutateAsync({
            id: activeRevisionId,
            thumbnailUrl: form.thumbnailUrl,
            title: form.title,
            description: form.description,
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
    ],
  )

  const handleSaveSeo = useCallback(
    async (payload: ArticleEditableSeoSavePayload) => {
      try {
        if (activeRevisionId) {
          notify('Updating article revision SEO...', 'info')

          await updateArticleRevisionMutation.mutateAsync({
            id: activeRevisionId,
            ...payload,
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
    [activeRevisionId, updateArticleRevisionMutation, notify, queryClient, articleRevisionKey],
  )

  const handleUpdateContent = useCallback(
    async (editor: Editor) => {
      try {
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
    [activeRevisionId, updateArticleRevisionMutation, notify],
  )

  const handlePreview = useCallback(() => {
    if (!article?.slug || !activeRevisionId) {
      return
    }

    window.open(`/preview/${article?.slug}?revisionId=${activeRevisionId}`, '_blank')
  }, [article, activeRevisionId])

  const handlePublish = useCallback(async () => {
    try {
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
      })

      notify('Article published', 'success')

      queryClient.invalidateQueries([articleKey])
      queryClient.invalidateQueries([articleRevisionKey])
    } catch (error) {
      logger.error(error)
    }
  }, [
    article,
    articleId,
    activeRevisionId,
    articleRevision,
    updateArticleMutation,
    updateArticleRevisionMutation,
    notify,
    queryClient,
    articleKey,
    articleRevisionKey,
  ])

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
      isPublishEnabled: articleRevision?.status === ArticleRevisionStatus.DRAFT,
      onPublish: handlePublish,
    })

    const filteredSteps = steps.filter((step) => {
      if (articleId && step.value === 'seo' && (!article || !articleRevision)) {
        return false
      }

      return true
    })

    return filteredSteps
  }, [articleId, article, articleRevision, handlePublish, handlePreview, handleSavePreview, handleSaveSeo, handleUpdateContent])

  const finalActiveTab = useMemo(() => {
    const isTabValid = steps.some((step) => step.value === activeTab)

    if (isTabValid) {
      return activeTab
    }

    return steps?.[0]?.value ?? ''
  }, [activeTab, steps])

  /**
   * TODO 1:
   * Открытие
   * 1. Если есть артикл - фетчим, если нет - создаем после определенных действий
   * 2. Id текущей ревизии по сути делаем аналогичное поведение, допом еще можем тянуть список ревизий
   *
   * Создание
   * 1. Создаем артикл после определенных действий и следом артикл ревижн, нужно сразу о определенной логике сделать линковки
   * 2. Далее уже этот артикл и тд пробрасываем по цепочке, наверное лучше через контекст/провайдер, хотя может достаточно и пропсов?
   *
   */

  /**
   * Тут надо сделать логику шагов
   * 1. Новая статья - шаг заполнения тайтла/дескрипшена и картинки
   * 2. далее экоран статьи
   * 3. финальный экран настройки сео и тд
   *
   * Шаги SPA, сверху табы чтобы всегда можно было вернуться или вперед убежать и тд
   */

  /**
   * TODO 2: Нужна публикация - отдельная вкладка
   * При публикации нужно указывать revisionId в статье, мы таким образом жестко привязываемся именно к этой ревизии
   * Еще заложить установку версии в article
   * Еще для редактирования нужно заложить выбор ревизии для просмотра, если опубликованная ревизия - то только просмотр, если нужно отредактировать - то:
   * берем ревизию и создаем ее дубль - даем работу именно в ней - выше логика сбора ревизий при открытии статьи автоматом подтянет последнюю созданную
   * можно заложить некую историю по ревизиям с их корректными статусами и текущей выбранной ревизией
   *
   * Публикация ревизии должно по новой идти по шагам привязки актуальной ревизии и так далее:
   * slug уже не даем менять, каноникал кажется можно менять в целом (все табы у нас держатся в рамках корректной ревизии кроме слага, он жестко завязан на рутовом артикле)
   */

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {isGlobalLoading ? (
        <SpinnerScreen />
      ) : (
        <>
          <TabsContainer searchMutable tabs={steps} activeTab={finalActiveTab} currentTab={activeTab} onTabChange={setActiveTab} />
        </>
      )}
    </div>
  )
}
