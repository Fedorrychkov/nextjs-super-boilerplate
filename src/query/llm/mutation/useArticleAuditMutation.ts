import { useMutation } from 'react-query'

import { ArticleAuditApiResponse, type ArticleAuditDto, ClientLlmApi } from '~/api/llm'

export const useArticleAuditMutation = () => {
  const articleAuditMutation = useMutation<ArticleAuditApiResponse, Error, ArticleAuditDto>(async (dto) => {
    const api = new ClientLlmApi()

    return api.postArticleAudit(dto)
  })

  return { articleAuditMutation }
}
