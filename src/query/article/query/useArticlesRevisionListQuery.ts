import { ArticleRevisionFilter, ArticleRevisionModel, ClientArticleRevisionApi } from '~/api/article-revision'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'
import { PaginationMeta } from '~/types'
import { jsonStringifySafety } from '~/utils/jsonSafe'

export const ARTICLE_REVISION_LIST_QUERY_KEY = 'articles-revision-list'

export const fetchArticlesRevision = (filter: Partial<ArticleRevisionFilter>) => async (): Promise<PaginationMeta<ArticleRevisionModel>> => {
  const api = new ClientArticleRevisionApi()

  return api.getArticleRevisions(filter)
}

export const useArticlesRevisionListQuery = (
  filter: Partial<ArticleRevisionFilter>,
  enabled = true,
  onSuccess?: (data: PaginationMeta<ArticleRevisionModel>) => void,
) => {
  const props = useQueryBuilder({
    key: [ARTICLE_REVISION_LIST_QUERY_KEY, jsonStringifySafety(filter)].join('-'),
    enabled,
    method: fetchArticlesRevision(filter),
    options: {
      onSuccess: (data) => {
        onSuccess?.(data)
      },
    },
  })

  return props
}
