import { getServerForPublicArticle } from '@lib/server-action/server-article'
import { forgetArticleMisses, isKnownArticleMiss, rememberArticleMiss } from '@lib/services/article-page-miss'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'
import { revalidateTag, unstable_cache } from 'next/cache'

import { ArticleModel, ArticleVisibility } from '~/api/article'
import { ArticleRevisionModel } from '~/api/article-revision'
import { defaultExtensions } from '~/components/Blocks/Editor/extensions'
import { finalizeArticleBodyHtml } from '~/lib/editor/finalizeArticleBodyHtml'
import { renderPublicArticleBodyMarkdown } from '~/lib/editor/renderPublicArticleBodyMarkdown'
import { jsonParseSafety } from '~/utils/jsonSafe'

export const publicArticleCacheTag = (slug: string) => `public-article:${slug}`

/**
 * Drop everything cached about a public article page: the cached hit (tag) and a remembered miss.
 * Use this, not `revalidateTag` alone — a remembered miss would keep a just-published article a
 * 404 for up to a minute.
 */
export async function invalidatePublicArticlePage(slug: string): Promise<void> {
  revalidateTag(publicArticleCacheTag(slug), 'max')
  await forgetArticleMisses([slug])
}

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

class ArticleMiss extends Error {}

/**
 * Cached article body + DB payload for `/article/[slug]`.
 * Invalidate with `invalidatePublicArticlePage(slug)` on publish / revision update.
 *
 * Only hits are cached here; a miss is remembered for a minute in the shared cache
 * (lib/services/article-page-miss.ts), which publishing — including the worker's scheduled
 * publishing — clears.
 */
export async function getCachedPublicArticlePagePayload(slug: string): Promise<PublicArticlePagePayload | null> {
  if (await isKnownArticleMiss(slug)) return null

  try {
    return await unstable_cache(
      async () => {
        const payload = await loadPublicArticlePagePayload(slug)

        if (!payload) throw new ArticleMiss()

        return payload
      },
      ['public-article-page', 'v2-body-markdown', slug],
      { tags: [publicArticleCacheTag(slug)], revalidate: false },
    )()
  } catch (error) {
    if (!(error instanceof ArticleMiss)) throw error

    await rememberArticleMiss(slug)

    return null
  }
}
