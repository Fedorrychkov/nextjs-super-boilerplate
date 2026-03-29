import { useMutation, useQueryClient } from 'react-query'

import { ClientLlmApi, type LlmImageGenerateApiResponse } from '~/api/llm'
import type { LlmImageGenerateDto } from '~/api/llm/types'
import { buildLlmArticleUsageQueryKey } from '~/query/llm/query/useLlmArticleUsageQuery'

export const useLlmImageGenerateMutation = () => {
  const queryClient = useQueryClient()

  return useMutation<LlmImageGenerateApiResponse, Error, LlmImageGenerateDto>({
    mutationFn: async (dto) => {
      const api = new ClientLlmApi()

      return api.postImageGenerate(dto)
    },
    onSuccess: (_data, dto) => {
      void queryClient.invalidateQueries('media-assets')
      void queryClient.invalidateQueries(buildLlmArticleUsageQueryKey({ articleId: dto.articleId, revisionId: dto.revisionId }))
    },
  })
}
