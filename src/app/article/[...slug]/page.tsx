import '../../../components/Blocks/Editor/styles/editor.styles.scss'

import { PageProps } from '@lib/page'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { ArticleVisibility } from '~/api/article'
import { ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { ArticlePublishedDate } from '~/components/Views/Article/Block/server/ArticlePublishedDate'
import { getCachedPublicArticlePagePayload } from '~/lib/cache/publicArticlePageCache'
import { trackAiReferralVisit } from '~/lib/seo/aiReferrals'
import { resolvePublicArticlePageMeta } from '~/lib/seo/articleMeta'
import { getArticleJsonLd, JsonLd } from '~/lib/seo/jsonld'
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

  const payload = await getCachedPublicArticlePagePayload(slug)

  if (!payload) {
    return {
      title: 'Article',
    }
  }

  const { response } = payload
  const metadata = response.revision.metadata

  const seoData = metadata && 'seo' in metadata ? (metadata.seo as ArticleRevisionSeoMetadata) : {}

  const meta = resolvePublicArticlePageMeta({
    slug,
    revision: response.revision ?? {},
    article: response.article ?? { slug, visibility: ArticleVisibility.PUBLIC },
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

  const slug = params.slug[0] ?? ''
  const payload = await getCachedPublicArticlePagePayload(slug)

  if (!payload) {
    return notFound()
  }

  const { response, bodyHtml, slugResolved } = payload

  logger.info({ params, response })

  const articleMetadata = response.revision.metadata as { seo?: ArticleRevisionSeoMetadata } | undefined
  const seoJson = articleMetadata?.seo ?? {}
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

  const publishedAt = response.revision.publishedAt ?? response.article.publishedAt
  const requestHeaders = await headers()
  const referrer = requestHeaders.get('referer')
  const userAgent = requestHeaders.get('user-agent')

  try {
    await trackAiReferralVisit({
      pathname: `/article/${slugResolved}`,
      referrer,
      userAgent,
    })
  } catch (error) {
    logger.warn('Failed to persist AI referral', {
      slug: slugResolved,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <ArticlePublishedDate publishedAt={publishedAt} className="mb-4 text-muted-foreground" />
      <div className="max-w-full tiptap readonly" dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  )
}

export default ArticlePublicRoot
