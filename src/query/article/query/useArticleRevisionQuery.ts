import { ArticleRevisionModel, ClientArticleRevisionApi } from '~/api/article-revision'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const ARTICLE_REVISION_QUERY_KEY = 'single-article-revision'

export const fetchArticleRevision = (id: string) => async (): Promise<ArticleRevisionModel> => {
  const api = new ClientArticleRevisionApi()

  return api.getArticleRevision(id)
}

export const useArticleRevisionQuery = (id: string, enabled = true, onSuccess?: (data: ArticleRevisionModel) => void) => {
  const props = useQueryBuilder({
    key: [ARTICLE_REVISION_QUERY_KEY, id].join('-'),
    enabled,
    method: fetchArticleRevision(id),
    options: {
      onSuccess: (data) => {
        onSuccess?.(data)
      },
    },
  })

  return { ...props, key: [ARTICLE_REVISION_QUERY_KEY, id].join('-') }
}
