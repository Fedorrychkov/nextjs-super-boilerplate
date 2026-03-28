import type { ArticleModel } from '~/api/article'
import type { ArticleRevisionModel } from '~/api/article-revision'

import { buildArticleContextBlock } from './build-article-chat-context'
import { CONTENT_SUGGEST_JSON_INSTRUCTION } from './content-suggest-instruction'
import { extractPlainTextFromRevisionContent } from './extract-plain-text-from-revision-content'

const MAX_BODY_PLAIN_CHARS = 14_000

export function buildContentSuggestMessages(params: { article: ArticleModel; revision: ArticleRevisionModel }): {
  system: string
  user: string
} {
  const { article, revision } = params
  const context = buildArticleContextBlock({ article, revision })
  const bodyPlain = extractPlainTextFromRevisionContent(revision.content ?? '')
  const truncated =
    bodyPlain.length > MAX_BODY_PLAIN_CHARS ? `${bodyPlain.slice(0, MAX_BODY_PLAIN_CHARS)}\n\n[... truncated for context length ...]` : bodyPlain

  const system = [
    'You are an editorial assistant for a CMS. Propose a full article body in Markdown based on the context.',
    'Output must be valid JSON only, following the schema in the user message.',
  ].join('\n')

  const user = [
    CONTENT_SUGGEST_JSON_INSTRUCTION,
    '',
    '--- Context (structured) ---',
    '',
    context,
    '',
    '--- Article body as plain text (may be truncated above) ---',
    '',
    truncated.trim() || '(empty — write a starter draft from title/description if possible)',
  ].join('\n')

  return { system, user }
}
