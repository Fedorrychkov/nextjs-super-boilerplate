import { countTokens } from 'gpt-tokenizer'

/**
 * Token count for public Markdown responses (`x-markdown-tokens`).
 * Uses package default encoding (**o200k_base**), aligned with recent OpenAI chat models.
 */
export function countPublicArticleMarkdownTokens(markdown: string): number {
  return countTokens(markdown)
}
