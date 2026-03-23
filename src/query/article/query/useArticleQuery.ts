import { ArticleModel, ClientArticleApi } from '~/api/article'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const ARTICLE_QUERY_KEY = 'single-article'

export const fetchArticle = (id: string) => async (): Promise<ArticleModel> => {
  const api = new ClientArticleApi()

  return api.getArticle(id)
}

export const useArticleQuery = (id: string, enabled = true, onSuccess?: (data: ArticleModel) => void) => {
  const props = useQueryBuilder({
    key: [ARTICLE_QUERY_KEY, id].join('-'),
    enabled,
    method: fetchArticle(id),
    options: {
      onSuccess: (data) => {
        onSuccess?.(data)
      },
    },
  })

  return { ...props, key: [ARTICLE_QUERY_KEY, id].join('-') }
}
