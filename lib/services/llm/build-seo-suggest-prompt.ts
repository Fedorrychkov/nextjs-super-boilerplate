import type { ArticleModel } from '~/api/article'
import type { ArticleRevisionModel } from '~/api/article-revision'

import { buildArticleContextBlock } from './build-article-chat-context'
import { SEO_SUGGEST_JSON_INSTRUCTION } from './seo-suggest-instruction'

export function buildSeoSuggestMessages(params: { article: ArticleModel; revision: ArticleRevisionModel }): {
  system: string
  user: string
} {
  const context = buildArticleContextBlock(params)

  const system = [
    'You are an SEO specialist for a CMS. Propose improved meta and Open Graph text fields based on the article context.',
    'Output must be valid JSON only, following the schema in the user message.',
  ].join('\n')

  const user = [SEO_SUGGEST_JSON_INSTRUCTION, '', '--- Context ---', '', context].join('\n')

  return { system, user }
}
