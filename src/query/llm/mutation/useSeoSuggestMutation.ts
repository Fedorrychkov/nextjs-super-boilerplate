import { useMutation } from 'react-query'

import { ClientLlmApi, type SeoSuggestApiResponse, type SeoSuggestDto } from '~/api/llm'

export const useSeoSuggestMutation = () => {
  const seoSuggestMutation = useMutation<SeoSuggestApiResponse, Error, SeoSuggestDto>(async (dto) => {
    const api = new ClientLlmApi()

    return api.postSeoSuggest(dto)
  })

  return { seoSuggestMutation }
}
