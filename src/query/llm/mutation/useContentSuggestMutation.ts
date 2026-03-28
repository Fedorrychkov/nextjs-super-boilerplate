import { useMutation } from 'react-query'

import { ClientLlmApi, type ContentSuggestApiResponse, type ContentSuggestDto } from '~/api/llm'

export const useContentSuggestMutation = () => {
  const contentSuggestMutation = useMutation<ContentSuggestApiResponse, Error, ContentSuggestDto>(async (dto) => {
    const api = new ClientLlmApi()

    return api.postContentSuggest(dto)
  })

  return { contentSuggestMutation }
}
