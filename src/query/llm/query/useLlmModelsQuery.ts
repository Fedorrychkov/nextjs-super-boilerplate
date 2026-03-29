import { ClientLlmApi, LlmModelsResponse } from '~/api/llm'
import { useQueryBuilder } from '~/hooks/useQueryBuilder'

export const LLM_MODELS_QUERY_KEY = 'llm-models'

export const useLlmModelsQuery = (enabled = true) => {
  return useQueryBuilder<LlmModelsResponse, Error>({
    key: LLM_MODELS_QUERY_KEY,
    enabled,
    method: async () => {
      const api = new ClientLlmApi()

      return api.listModels()
    },
  })
}
