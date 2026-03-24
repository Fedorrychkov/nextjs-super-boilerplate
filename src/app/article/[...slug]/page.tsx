import '../../../components/Blocks/Editor/styles/editor.styles.scss'

import { PageProps } from '@lib/page'
import { getServerForPublicArticle } from '@lib/server-action/server-article'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArticleVisibility } from '~/api/article'
import { ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { defaultExtensions } from '~/components/Blocks/Editor/extensions'
import { finalizeArticleBodyHtml } from '~/lib/editor/finalizeArticleBodyHtml'
import { resolvePublicArticlePageMeta } from '~/lib/seo/articleMeta'
import { getArticleJsonLd, JsonLd } from '~/lib/seo/jsonld'
import { jsonParseSafety } from '~/utils/jsonSafe'
import { Logger } from '~/utils/logger'

const logger = new Logger(['ArticlePublicRoot', '[src/app/article/[...slug]/page.tsx]'])

export const dynamic = 'force-dynamic'

export const generateMetadata = async (props: PageProps<{ slug: string[] }>): Promise<Metadata> => {
  const params = await props.params

  const slug = params.slug?.[0]

  if (!slug) {
    return {
      title: 'Article',
    }
  }

  const response = await getServerForPublicArticle(slug ?? '', { visibility: ArticleVisibility.PUBLIC })

  const metadata = response?.revision?.metadata

  const seoData = metadata && 'seo' in metadata ? (metadata.seo as ArticleRevisionSeoMetadata) : {}

  const meta = resolvePublicArticlePageMeta({
    slug,
    revision: response?.revision ?? {},
    article: response?.article ?? { slug, visibility: ArticleVisibility.PUBLIC },
    seo: seoData,
  })

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: meta.canonical,
    },
    robots: {
      index: seoData?.noindex !== true,
      follow: seoData?.nofollow !== true,
      noarchive: false,
      nocache: false,
      noimageindex: false,
    },
    openGraph: {
      type: 'article',
      title: meta.ogTitle,
      description: meta.ogDescription,
      images: meta.image ? [meta.image] : undefined,
    },
    twitter: {
      card: seoData?.twitterCard || 'summary_large_image',
      title: meta.ogTitle,
      description: meta.ogDescription,
      images: meta.image ? [meta.image] : undefined,
    },
  }
}

const ArticlePublicRoot = async (props: PageProps<{ slug: string[] }>) => {
  const params = await props.params

  if (!params.slug) {
    return notFound()
  }

  const response = await getServerForPublicArticle(params.slug?.[0] ?? '', { visibility: ArticleVisibility.PUBLIC })

  if (!response || response?.article?.visibility !== ArticleVisibility.PUBLIC) {
    return notFound()
  }

  logger.info({ params, response })

  const content = jsonParseSafety<any[]>(response.revision.content ?? '')

  if (!content) {
    return notFound()
  }

  const generatedPageString = finalizeArticleBodyHtml(await renderToHTMLString({ content, extensions: defaultExtensions() }))
  const articleMetadata = response.revision.metadata as { seo?: ArticleRevisionSeoMetadata } | undefined
  const seoJson = articleMetadata?.seo ?? {}
  const slugResolved = response.article.slug ?? params.slug?.[0] ?? ''
  const pageMeta = resolvePublicArticlePageMeta({
    slug: slugResolved,
    revision: response.revision,
    article: response.article,
    seo: seoJson,
  })

  const articleJsonLd = getArticleJsonLd({
    slug: slugResolved,
    title: response.revision.title ?? response.article.slug ?? 'Article',
    description: response.revision.description,
    image: response.revision.thumbnailUrl,
    datePublished: response.revision.publishedAt ?? response.article.publishedAt,
    dateModified: response.revision.updatedAt ?? response.article.updatedAt,
    canonicalUrl: pageMeta.canonical,
    keywords: seoJson.keywords,
    isAccessibleForFree: true,
  })

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <div className="max-w-full tiptap readonly" dangerouslySetInnerHTML={{ __html: generatedPageString }} />
    </>
  )
}

export default ArticlePublicRoot
