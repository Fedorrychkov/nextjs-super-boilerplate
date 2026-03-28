import type { ArticleModel } from '~/api/article'
import type { ArticleRevisionModel } from '~/api/article-revision'

import { buildArticleContextBlock } from './build-article-chat-context'

export const IMAGE_PROMPT_STREAM_SYSTEM =
  'You help CMS authors write prompts for AI image generators (e.g. GPT Image). Output only the prompt text: no quotes, no markdown fences, no preamble or explanation.'

export const IMAGE_PROMPT_FROM_ARTICLE_SYSTEM =
  'You derive a single English image-generation prompt from article context. Output only the prompt: concrete, visual, suitable for a hero or in-article illustration. No quotes, no markdown, max 500 characters.'

/**
 * User block for “suggest image prompt” stream and for internal “from article” compact generation.
 * Body text excludes embedded media blocks (same as SEO suggest).
 */
export function buildImagePromptUserBlock(params: { article: ArticleModel; revision: ArticleRevisionModel }): string {
  const ctx = buildArticleContextBlock({ ...params, bodyPlainMode: 'excludeMedia' })

  return [
    'Write ONE concise image generation prompt in English for a strong hero, thumbnail, or in-article illustration.',
    'Be specific about subject, setting, lighting, and style when inferable from the article.',
    '',
    '--- Article context ---',
    '',
    ctx,
  ].join('\n')
}
