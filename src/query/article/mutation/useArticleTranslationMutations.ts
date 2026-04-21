import { useMutation, useQueryClient } from 'react-query'

import { ClientArticleApi } from '~/api/article'

import { ARTICLE_QUERY_KEY } from '../query/useArticleQuery'
import { ARTICLE_LIST_QUERY_KEY } from '../query/useArticlesListQuery'
import { ARTICLE_REVISION_LIST_QUERY_KEY } from '../query/useArticlesRevisionListQuery'
import { ARTICLE_TRANSLATION_SIBLINGS_QUERY_KEY } from '../query/useArticleTranslationSiblingsQuery'

const invalidateArticleKeys = (queryClient: ReturnType<typeof useQueryClient>, articleIds: string[]) => {
  for (const id of articleIds) {
    queryClient.invalidateQueries([ARTICLE_QUERY_KEY, id].join('-'))
  }
  void queryClient.invalidateQueries(ARTICLE_LIST_QUERY_KEY)
  void queryClient.invalidateQueries(ARTICLE_REVISION_LIST_QUERY_KEY)
}

export const useArticleTranslationLinkMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: { articleIds: string[]; translationGroupId?: string | null }) => {
      const api = new ClientArticleApi()

      return api.translationLink(body)
    },
    onSuccess: (data) => {
      const ids = data.articles.map((a) => a.id)
      invalidateArticleKeys(queryClient, ids)
      for (const id of ids) {
        queryClient.invalidateQueries([ARTICLE_TRANSLATION_SIBLINGS_QUERY_KEY, id].join('-'))
      }
    },
  })
}

export const useArticleTranslationUnlinkMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: { articleIds: string[] }) => {
      const api = new ClientArticleApi()

      return api.translationUnlink(body)
    },
    onSuccess: (data) => {
      const ids = data.articles.map((a) => a.id)
      invalidateArticleKeys(queryClient, ids)
      for (const id of ids) {
        queryClient.invalidateQueries([ARTICLE_TRANSLATION_SIBLINGS_QUERY_KEY, id].join('-'))
      }
    },
  })
}

export const useArticleTranslationPublishBatchMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: { articleIds: string[] }) => {
      const api = new ClientArticleApi()

      return api.translationPublishBatch(body)
    },
    onSuccess: (data) => {
      const ids = [...new Set([...data.publishedIds, ...data.articles.map((a) => a.id)])]
      invalidateArticleKeys(queryClient, ids)
      for (const id of ids) {
        queryClient.invalidateQueries([ARTICLE_TRANSLATION_SIBLINGS_QUERY_KEY, id].join('-'))
      }
    },
  })
}

export const useArticleTranslationUnpublishBatchMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: { articleIds: string[] }) => {
      const api = new ClientArticleApi()

      return api.translationUnpublishBatch(body)
    },
    onSuccess: (data) => {
      const ids = [...new Set([...data.unpublishedIds, ...data.articles.map((a) => a.id)])]
      invalidateArticleKeys(queryClient, ids)
      for (const id of ids) {
        queryClient.invalidateQueries([ARTICLE_TRANSLATION_SIBLINGS_QUERY_KEY, id].join('-'))
      }
    },
  })
}

export const useArticleTranslationRestorePublishedBatchMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: { articleIds: string[] }) => {
      const api = new ClientArticleApi()

      return api.translationRestorePublishedBatch(body)
    },
    onSuccess: (data) => {
      const ids = [...new Set([...data.restoredIds, ...data.articles.map((a) => a.id)])]
      invalidateArticleKeys(queryClient, ids)
      for (const id of ids) {
        queryClient.invalidateQueries([ARTICLE_TRANSLATION_SIBLINGS_QUERY_KEY, id].join('-'))
      }
    },
  })
}

export const useArticleTranslationCreateMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (body: { sourceArticleId: string; locale: string; slug?: string | null; sourceRevisionId?: string | null }) => {
      const api = new ClientArticleApi()

      return api.translationCreate(body)
    },
    onSuccess: (data, variables) => {
      const ids = [...new Set([data.article.id, variables.sourceArticleId])]
      invalidateArticleKeys(queryClient, ids)
      for (const id of ids) {
        queryClient.invalidateQueries([ARTICLE_TRANSLATION_SIBLINGS_QUERY_KEY, id].join('-'))
      }
    },
  })
}
