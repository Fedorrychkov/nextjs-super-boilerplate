import { useMutation, useQueryClient } from 'react-query'

import { ArticleListenAudioGenerateResponse, ClientArticleApi } from '~/api/article'
import { buildLlmArticleUsageQueryKey } from '~/query/llm/query/useLlmArticleUsageQuery'

import { ARTICLE_QUERY_KEY } from '../query/useArticleQuery'

export const useArticleListenAudioGenerateMutation = (articleId: string | null | undefined) => {
  const queryClient = useQueryClient()

  return useMutation<ArticleListenAudioGenerateResponse, Error, { voice?: string }>(
    async (opts) => {
      if (!articleId) {
        throw new Error('articleId required')
      }

      const api = new ClientArticleApi()

      return api.generateListenAudio({ articleId, voice: opts.voice })
    },
    {
      onSuccess: (data) => {
        if (articleId) {
          void queryClient.invalidateQueries([ARTICLE_QUERY_KEY, articleId].join('-'))
        }

        if (articleId && data.sourceRevisionId) {
          void queryClient.invalidateQueries(buildLlmArticleUsageQueryKey({ articleId, revisionId: data.sourceRevisionId }))
        }
      },
    },
  )
}
