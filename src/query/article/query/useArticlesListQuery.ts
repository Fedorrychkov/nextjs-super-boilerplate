import { ArticleFilter, ArticleModel, ClientArticleApi } from '~/api/article'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'
import { PaginationMeta } from '~/types'
import { jsonStringifySafety } from '~/utils/jsonSafe'

export const ARTICLE_LIST_QUERY_KEY = 'articles-list'

export const fetchArticles = (filter: Partial<ArticleFilter>) => async (): Promise<PaginationMeta<ArticleModel>> => {
  const api = new ClientArticleApi()

  return api.getArticles(filter)
}

export const useArticlesListQuery = (filter: Partial<ArticleFilter>, enabled = true, onSuccess?: (data: PaginationMeta<ArticleModel>) => void) => {
  const props = useQueryBuilder({
    key: [ARTICLE_LIST_QUERY_KEY, jsonStringifySafety(filter)].join('-'),
    enabled,
    method: fetchArticles(filter),
    options: {
      onSuccess: (data) => {
        onSuccess?.(data)
      },
    },
  })

  return props
}
