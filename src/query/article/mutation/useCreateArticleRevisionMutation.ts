import { useMutation } from 'react-query'

import { ArticleRevisionModel, ClientArticleRevisionApi } from '~/api/article-revision'

export const useCreateArticleRevisionMutation = () => {
  const createArticleRevisionMutation = useMutation(async (dto: Partial<ArticleRevisionModel>) => {
    const api = new ClientArticleRevisionApi()

    const response = await api.createArticleRevision(dto)

    return response
  })

  return { createArticleRevisionMutation }
}
