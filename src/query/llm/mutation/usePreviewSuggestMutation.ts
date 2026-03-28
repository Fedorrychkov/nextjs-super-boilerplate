import { useMutation } from 'react-query'

import { ClientLlmApi, type PreviewSuggestApiResponse, type PreviewSuggestDto } from '~/api/llm'

export const usePreviewSuggestMutation = () => {
  const previewSuggestMutation = useMutation<PreviewSuggestApiResponse, Error, PreviewSuggestDto>(async (dto) => {
    const api = new ClientLlmApi()

    return api.postPreviewSuggest(dto)
  })

  return { previewSuggestMutation }
}
