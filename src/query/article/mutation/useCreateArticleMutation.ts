import { useMutation } from 'react-query'

import { ArticleModel, ClientArticleApi } from '~/api/article'

export const useCreateArticleMutation = () => {
  const createArticleMutation = useMutation(async (dto: Partial<ArticleModel>) => {
    const api = new ClientArticleApi()

    const response = await api.createArticle(dto)

    return response
  })

  return { createArticleMutation }
}
