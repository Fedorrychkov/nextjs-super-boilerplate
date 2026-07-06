import '../../../components/Blocks/Editor/styles/editor.styles.scss'

import { defaultGuard, PageProps } from '@lib/page'
import { getServerArticle } from '@lib/server-action/server-article'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { UserRole } from '~/api/user'
import { defaultExtensions } from '~/components/Blocks/Editor/extensions'
import { Typography } from '~/components/ui'
import { ArticlePublishedDate } from '~/components/Views/Article/Block/server/ArticlePublishedDate'
import { ArticlePublicListenAudio } from '~/components/Views/Article/Public/ArticlePublicListenAudio'
import { ArticleReadingShell } from '~/components/Views/Article/Public/ArticleReadingShell'
import { FALLBACK_THUMBNAIL_IMAGE } from '~/constants'
import { finalizeArticleBodyHtml } from '~/lib/editor/finalizeArticleBodyHtml'
import { resolveArticleCanonicalUrl } from '~/lib/seo/articleCanonical'
import { resolveArticleLanguage } from '~/lib/seo/articleLanguage'
import { seoConfig } from '~/lib/seo/config'
import { getArticleJsonLd, JsonLd } from '~/lib/seo/jsonld'
import { jsonParseSafety } from '~/utils/jsonSafe'
import { Logger } from '~/utils/logger'

const logger = new Logger(['PreviewRoot', '[src/app/preview/[...slug]/page.tsx]'])

export const generateMetadata = async (props: PageProps<{ slug: string[] }>): Promise<Metadata> => {
  const params = await props.params
  const { revisionId } = await props.searchParams

  const slug = params.slug?.[0]

  if (!slug) {
    return {
      title: 'Article Preview',
      robots: {
        index: false,
        follow: false,
        noarchive: true,
        nocache: true,
        noimageindex: true,
      },
    }
  }

  const response = await getServerArticle(slug, typeof revisionId === 'string' ? revisionId : undefined)
  const title = response?.revision?.title?.trim() || response?.article?.slug || slug

  const metadata = response?.revision?.metadata

  const seoData = metadata && 'seo' in metadata ? (metadata.seo as ArticleRevisionSeoMetadata) : {}
  const articleLanguage = resolveArticleLanguage(seoData?.language)
  const slugResolved = response?.article?.slug ?? slug
  const canonical =
    slugResolved && response?.article
      ? resolveArticleCanonicalUrl(seoConfig.siteUrl, slugResolved, response.article.visibility, seoData.canonicalUrl)
      : undefined

  return {
    title: `${title} (Preview)`,
    description: response?.revision?.description?.trim() || 'Private article preview',
    alternates: canonical ? { canonical } : undefined,
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nocache: true,
      noimageindex: true,
    },
    openGraph: {
      title: `${seoData?.metaTitle || title} (Preview)`,
      description: seoData?.metaDescription || response?.revision?.description?.trim() || 'Private article preview',
      images: [seoData?.ogImageUrl || response?.revision?.thumbnailUrl || FALLBACK_THUMBNAIL_IMAGE],
      locale: articleLanguage,
    },
    twitter: {
      card: seoData?.twitterCard || 'summary_large_image',
      title: `${seoData?.metaTitle || title} (Preview)`,
      description: seoData?.metaDescription || response?.revision?.description?.trim() || 'Private article preview',
      images: [seoData?.ogImageUrl || response?.revision?.thumbnailUrl || FALLBACK_THUMBNAIL_IMAGE],
    },
  }
}

const PreviewRoot = async (props: PageProps<{ slug: string[] }>) => {
  await defaultGuard({
    ...props,
    segments: ['admin', 'articles'],
    fallbackNavigatePath: '/',
    roles: [UserRole.ADMIN, UserRole.EDITOR],
    fallbackRolesNavigatePath: { [UserRole.USER]: '/' },
  })

  const params = await props.params
  const { revisionId } = await props.searchParams

  if (!params.slug) {
    return notFound()
  }

  const response = await getServerArticle(params.slug?.[0] ?? '', typeof revisionId === 'string' ? revisionId : undefined)

  if (!response) {
    return notFound()
  }

  logger.info({ params, revisionId, response })

  const content = jsonParseSafety<any[]>(response.revision.content ?? '')

  if (!content) {
    return notFound()
  }

  const generatedPageString = finalizeArticleBodyHtml(await renderToHTMLString({ content, extensions: defaultExtensions() }))
  const articleMetadata = response.revision.metadata as { seo?: ArticleRevisionSeoMetadata } | undefined
  const seoJson = articleMetadata?.seo ?? {}
  const articleLanguage = resolveArticleLanguage(seoJson.language)
  const slugResolved = response.article.slug ?? params.slug?.[0] ?? ''
  const canonicalForJson = resolveArticleCanonicalUrl(seoConfig.siteUrl, slugResolved, response.article.visibility, seoJson.canonicalUrl)

  const articleJsonLd = getArticleJsonLd({
    slug: slugResolved,
    title: response.revision.title ?? response.article.slug ?? 'Article',
    description: response.revision.description,
    image: response.revision.thumbnailUrl || FALLBACK_THUMBNAIL_IMAGE,
    datePublished: response.revision.publishedAt ?? response.article.publishedAt,
    dateModified: response.revision.updatedAt ?? response.article.updatedAt,
    canonicalUrl: canonicalForJson,
    keywords: seoJson.keywords,
    language: articleLanguage,
    isAccessibleForFree: false,
  })

  const publishedAt = response.revision.publishedAt ?? response.article.publishedAt
  const title = response.revision.title ?? response.article.slug ?? 'Article'
  const thumbnailUrl = response.revision.thumbnailUrl || null

  return (
    <>
      <JsonLd data={articleJsonLd} />

      <ArticleReadingShell
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: `${title} (Preview)` }]}
        title={title}
        thumbnailUrl={thumbnailUrl}
        articleLanguage={articleLanguage}
        bodyHtml={generatedPageString}
        backLink={{ label: 'Back to admin', href: '/admin/articles' }}
        badge={
          <Typography
            asTag="span"
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-300 bg-violet-50 dark:bg-violet-950/40 dark:border-violet-800 px-3 py-1 text-xs font-medium text-violet-700 dark:text-violet-400"
          >
            👁 Preview mode
          </Typography>
        }
        meta={
          <>
            <ArticlePublishedDate publishedAt={publishedAt} />
            <ArticlePublicListenAudio assetId={response.article.listenAudioAssetId} />
          </>
        }
      />
    </>
  )
}

export default PreviewRoot
