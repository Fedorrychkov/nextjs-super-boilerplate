import { useQuery } from 'react-query'

import { ClientArticleViewsApi } from '~/api/article-views/client'
import type { ArticleViewsByArticlePayload } from '~/api/article-views/types'

export const articleViewsByArticleQueryKey = (articleId: string) => ['article-views-by-article', articleId] as const

export const fetchArticleViewsByArticle = (articleId: string) => async (): Promise<ArticleViewsByArticlePayload> => {
  const api = new ClientArticleViewsApi()

  return api.getByArticle(articleId)
}

export const useArticleViewsByArticleQuery = (articleId: string | null, enabled = true) => {
  return useQuery({
    queryKey: articleId ? articleViewsByArticleQueryKey(articleId) : ['article-views-by-article', ''],
    queryFn: articleId ? fetchArticleViewsByArticle(articleId) : async () => Promise.reject(new Error('no id')),
    enabled: Boolean(articleId) && enabled,
  })
}
