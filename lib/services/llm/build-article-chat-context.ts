import { type ArticleModel, ArticleVisibility } from '~/api/article'
import type { ArticleRevisionModel, ArticleRevisionSeoMetadata } from '~/api/article-revision'

import { extractPlainTextFromRevisionContent } from './extract-plain-text-from-revision-content'

/** Shared factual context for chat, audit, and other LLM features (preview + SEO + body). */
export function buildArticleContextBlock(params: { article: ArticleModel; revision: ArticleRevisionModel }): string {
  const { article, revision } = params
  const rawMeta = revision.metadata as { seo?: ArticleRevisionSeoMetadata | null } | undefined
  const seo = rawMeta?.seo

  const visibility = article.visibility ?? ArticleVisibility.PUBLIC
  const bodyPlain = extractPlainTextFromRevisionContent(revision.content ?? '')

  const lines = [
    `Article id: ${article.id}`,
    `Slug: ${article.slug ?? '(none)'}`,
    `Visibility: ${visibility}`,
    '',
    `Title: ${revision.title?.trim() || '(empty)'}`,
    `Short description: ${revision.description?.trim() || '(empty)'}`,
    '',
    'SEO (current draft):',
    `- metaTitle: ${seo?.metaTitle?.trim() || '(empty)'}`,
    `- metaDescription: ${seo?.metaDescription?.trim() || '(empty)'}`,
    `- keywords: ${seo?.keywords?.trim() || '(empty)'}`,
    `- language: ${seo?.language?.trim() || '(not set)'}`,
    '',
    '--- Article body (plain text, truncated if long) ---',
    bodyPlain || '(empty — no extractable text yet)',
  ]

  return lines.join('\n')
}

export function buildArticleChatSystemPrompt(params: { article: ArticleModel; revision: ArticleRevisionModel }): string {
  const context = buildArticleContextBlock(params)

  const lines = [
    'You are an editorial assistant inside a CMS. Help with SEO fields, structure, clarity, and ideas for the article.',
    'Respond in the same language as the article content and SEO language when that language is set; otherwise match the user message language.',
    'If the article body is empty or only whitespace, do not pretend to have read a full article — offer ideas, outlines, or questions until the author adds content.',
    '',
    context,
  ]

  return lines.join('\n')
}
