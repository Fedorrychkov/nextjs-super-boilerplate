import { getServerForPublicArticle } from '@lib/server-action/server-article'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'
import { unstable_cache } from 'next/cache'

import { ArticleModel, ArticleVisibility } from '~/api/article'
import { ArticleRevisionModel } from '~/api/article-revision'
import { defaultExtensions } from '~/components/Blocks/Editor/extensions'
import { finalizeArticleBodyHtml } from '~/lib/editor/finalizeArticleBodyHtml'
import { renderPublicArticleBodyMarkdown } from '~/lib/editor/renderPublicArticleBodyMarkdown'
import { jsonParseSafety } from '~/utils/jsonSafe'

export const publicArticleCacheTag = (slug: string) => `public-article:${slug}`

export type PublicArticlePagePayload = {
  response: { article: ArticleModel; revision: ArticleRevisionModel }
  bodyHtml: string
  bodyMarkdown: string
  slugResolved: string
}

async function loadPublicArticlePagePayload(slug: string): Promise<PublicArticlePagePayload | null> {
  const response = await getServerForPublicArticle(slug, { visibility: ArticleVisibility.PUBLIC })

  if (!response || response.article.visibility !== ArticleVisibility.PUBLIC) {
    return null
  }

  const content = jsonParseSafety<unknown>(response.revision.content ?? '')

  if (content == null) {
    return null
  }

  const extensions = defaultExtensions()
  const bodyHtml = finalizeArticleBodyHtml(await renderToHTMLString({ content: content as never, extensions }))
  const bodyMarkdown = renderPublicArticleBodyMarkdown(content as never) ?? ''

  return {
    response,
    bodyHtml,
    bodyMarkdown,
    slugResolved: response.article.slug ?? slug,
  }
}

/**
 * Cached article body + DB payload for `/article/[slug]`.
 * Invalidate with `revalidateTag(publicArticleCacheTag(slug))` on publish / revision update.
 */
export function getCachedPublicArticlePagePayload(slug: string) {
  return unstable_cache(async () => loadPublicArticlePagePayload(slug), ['public-article-page', 'v2-body-markdown', slug], {
    tags: [publicArticleCacheTag(slug)],
    revalidate: false,
  })()
}
