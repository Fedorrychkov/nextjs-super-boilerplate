import type { ArticleModel } from '~/api/article'
import type { ArticleRevisionModel } from '~/api/article-revision'

import { buildArticleContextBlock } from './build-article-chat-context'
import { PREVIEW_SUGGEST_JSON_INSTRUCTION } from './preview-suggest-instruction'

export function buildPreviewSuggestMessages(params: { article: ArticleModel; revision: ArticleRevisionModel }): {
  system: string
  user: string
} {
  const context = buildArticleContextBlock(params)

  const system = [
    'You are an editorial assistant. Propose a clearer article title and short description (preview card text) from the context.',
    'Output must be valid JSON only, following the schema in the user message.',
  ].join('\n')

  const user = [PREVIEW_SUGGEST_JSON_INSTRUCTION, '', '--- Context ---', '', context].join('\n')

  return { system, user }
}
