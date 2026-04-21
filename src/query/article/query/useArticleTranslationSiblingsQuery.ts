import { type ArticleTranslationSiblingsResponse, ClientArticleApi } from '~/api/article'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const ARTICLE_TRANSLATION_SIBLINGS_QUERY_KEY = 'article-translation-siblings'

export const fetchArticleTranslationSiblings = (articleId: string) => async (): Promise<ArticleTranslationSiblingsResponse> => {
  const api = new ClientArticleApi()

  return api.getTranslationSiblings(articleId)
}

export const useArticleTranslationSiblingsQuery = (articleId: string, enabled = true) => {
  return useQueryBuilder({
    key: [ARTICLE_TRANSLATION_SIBLINGS_QUERY_KEY, articleId].join('-'),
    enabled: Boolean(articleId) && enabled,
    method: fetchArticleTranslationSiblings(articleId),
  })
}
