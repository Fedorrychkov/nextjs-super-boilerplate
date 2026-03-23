'use server'

import '../../../components/Blocks/Editor/styles/editor.styles.scss'

import { PageProps } from '@lib/page'
import { getServerForPublicArticle } from '@lib/server-action/server-article'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArticleVisibility } from '~/api/article'
import { ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { defaultExtensions } from '~/components/Blocks/Editor/extensions'
import { getArticleJsonLd, JsonLd } from '~/lib/seo/jsonld'
import { jsonParseSafety } from '~/utils/jsonSafe'
import { Logger } from '~/utils/logger'

const logger = new Logger(['ArticlePublicRoot', '[src/app/article/[...slug]/page.tsx]'])

export const generateMetadata = async (props: PageProps<{ slug: string[] }>): Promise<Metadata> => {
  const params = await props.params

  const slug = params.slug?.[0]

  if (!slug) {
    return {
      title: 'Article',
    }
  }

  const response = await getServerForPublicArticle(slug ?? '', { visibility: ArticleVisibility.PUBLIC })
  const title = response?.revision?.title?.trim() || response?.article?.slug || slug

  const metadata = response?.revision?.metadata

  const seoData = metadata && 'seo' in metadata ? (metadata.seo as ArticleRevisionSeoMetadata) : {}
  const description = seoData?.metaDescription || response?.revision?.description?.trim() || 'Article page'
  const ogTitle = seoData?.ogTitle || seoData?.metaTitle || title
  const ogDescription = seoData?.ogDescription || description
  const image = seoData?.ogImageUrl || response?.revision?.thumbnailUrl || undefined

  return {
    title: seoData?.metaTitle || title,
    description,
    alternates: {
      canonical: seoData?.canonicalUrl || undefined,
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
      title: ogTitle,
      description: ogDescription,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: seoData?.twitterCard || 'summary_large_image',
      title: ogTitle,
      description: ogDescription,
      images: image ? [image] : undefined,
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

  const generatedPageString = await renderToHTMLString({ content, extensions: defaultExtensions() })
  const articleJsonLd = getArticleJsonLd({
    slug: response.article.slug ?? params.slug?.[0] ?? '',
    title: response.revision.title ?? response.article.slug ?? 'Article',
    description: response.revision.description,
    image: response.revision.thumbnailUrl,
    datePublished: response.revision.publishedAt ?? response.article.publishedAt,
    dateModified: response.revision.updatedAt ?? response.article.updatedAt,
  })

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <div className="max-w-full tiptap" dangerouslySetInnerHTML={{ __html: generatedPageString }} />
    </>
  )
}

export default ArticlePublicRoot
