import { useMutation } from 'react-query'

import { ArticleModel, ClientArticleApi } from '~/api/article'

export const useUpdateArticleMutation = () => {
  const updateArticleMutation = useMutation(async (dto: Partial<ArticleModel> & { id: string }) => {
    const api = new ClientArticleApi()

    const response = await api.updateArticle(dto.id, dto)

    return response
  })

  return { updateArticleMutation }
}
