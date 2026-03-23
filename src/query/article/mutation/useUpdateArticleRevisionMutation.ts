import { useMutation } from 'react-query'

import { ArticleRevisionModel, ClientArticleRevisionApi } from '~/api/article-revision'

export const useUpdateArticleRevisionMutation = () => {
  const updateArticleRevisionMutation = useMutation(async (dto: Partial<ArticleRevisionModel> & { id: string }) => {
    const api = new ClientArticleRevisionApi()

    const response = await api.updateArticleRevision(dto.id, dto)

    return response
  })

  return { updateArticleRevisionMutation }
}
