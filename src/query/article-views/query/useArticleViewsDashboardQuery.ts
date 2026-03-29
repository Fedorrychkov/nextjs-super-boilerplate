import { useQuery } from 'react-query'

import { ClientArticleViewsApi } from '~/api/article-views/client'
import type { ArticleViewsDashboardPayload } from '~/api/article-views/types'

export const articleViewsDashboardQueryKey = (limit: number) => ['article-views-dashboard', limit] as const

export const fetchArticleViewsDashboard = (limit: number) => async (): Promise<ArticleViewsDashboardPayload> => {
  const api = new ClientArticleViewsApi()

  return api.getDashboard(limit)
}

export const useArticleViewsDashboardQuery = (limit = 80, enabled = true) => {
  return useQuery({
    queryKey: articleViewsDashboardQueryKey(limit),
    queryFn: fetchArticleViewsDashboard(limit),
    enabled,
  })
}
