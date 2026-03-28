import type { ArticleRevisionSeoMetadata } from '~/api/article-revision'
import type { PublicArticlePagePayload } from '~/lib/cache/publicArticlePageCache'
import { resolveArticleLanguage } from '~/lib/seo/articleLanguage'
import { resolvePublicArticlePageMeta } from '~/lib/seo/articleMeta'

function yamlString(value: string): string {
  return JSON.stringify(value)
}

/**
 * YAML front matter + body markdown for `Accept: text/markdown` on public articles.
 */
export function buildPublicArticleMarkdownDocument(payload: PublicArticlePagePayload): string {
  const { response, bodyMarkdown, slugResolved } = payload
  const articleMetadata = response.revision.metadata as { seo?: ArticleRevisionSeoMetadata } | undefined
  const seoJson = articleMetadata?.seo ?? {}
  const pageMeta = resolvePublicArticlePageMeta({
    slug: slugResolved,
    revision: response.revision,
    article: response.article,
    seo: seoJson,
  })
  const language = resolveArticleLanguage(seoJson.language)
  const publishedAt = response.revision.publishedAt ?? response.article.publishedAt
  const updatedAt = response.revision.updatedAt ?? response.article.updatedAt
  const allowAi = response.article.allowAiTraining !== false ? 'yes' : 'no'

  const lines = [
    '---',
    `title: ${yamlString(pageMeta.title)}`,
    `description: ${yamlString(pageMeta.description)}`,
    `slug: ${yamlString(slugResolved)}`,
    `canonical: ${yamlString(pageMeta.canonical)}`,
    `language: ${yamlString(language)}`,
    `allow_ai_training: ${allowAi}`,
  ]

  if (publishedAt) {
    lines.push(`published_at: ${yamlString(new Date(publishedAt).toISOString())}`)
  }

  if (updatedAt) {
    lines.push(`updated_at: ${yamlString(new Date(updatedAt).toISOString())}`)
  }

  const md = typeof bodyMarkdown === 'string' ? bodyMarkdown : ''

  lines.push('---', '', md.trimEnd(), '')

  return lines.join('\n')
}
