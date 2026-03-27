import type { ArticleModel } from '~/api/article'
import type { ArticleRevisionModel } from '~/api/article-revision'

import { ARTICLE_AUDIT_JSON_INSTRUCTION } from './article-audit-instruction'
import { buildArticleContextBlock } from './build-article-chat-context'

/**
 * System + user messages for structured article audit (JSON response).
 */
export function buildArticleAuditMessages(params: { article: ArticleModel; revision: ArticleRevisionModel }): { system: string; user: string } {
  const contextBlock = buildArticleContextBlock(params)

  const system = [
    'You are an editorial and SEO auditor for a CMS.',
    'Analyse preview metadata (title, description, slug visibility), article body, and SEO fields together.',
    'Be concise; recommendations must be actionable.',
    'Respond with ONLY valid JSON — no markdown fences, no text before or after the JSON object.',
    '',
    ARTICLE_AUDIT_JSON_INSTRUCTION,
  ].join('\n')

  const user = ['Context (current draft):', '', contextBlock].join('\n')

  return { system, user }
}
