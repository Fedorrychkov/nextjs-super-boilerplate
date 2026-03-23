'use server'

import '../../../components/Blocks/Editor/styles/editor.styles.scss'

import { defaultGuard, PageProps } from '@lib/page'
import { getServerForPublicArticle } from '@lib/server-action/server-article'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'

import { ArticleVisibility } from '~/api/article'
import { ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { UserRole } from '~/api/user'
import { defaultExtensions } from '~/components/Blocks/Editor/extensions'
import { getArticleJsonLd, JsonLd } from '~/lib/seo/jsonld'
import { jsonParseSafety } from '~/utils/jsonSafe'
import { Logger } from '~/utils/logger'

const logger = new Logger(['PrivateArticleRoot', '[src/app/private-article/[...slug]/page.tsx]'])

export const generateMetadata = async (props: PageProps<{ slug: string[] }>): Promise<Metadata> => {
  const params = await props.params

  const slug = params.slug?.[0]

  if (!slug) {
    return {
      title: 'Article',
      robots: {
        index: false,
        follow: false,
        noarchive: true,
        nocache: true,
        noimageindex: true,
      },
    }
  }

  const response = await getServerForPublicArticle(slug ?? '')
  const title = response?.revision?.title?.trim() || response?.article?.slug || slug

  const metadata = response?.revision?.metadata

  const seoData = metadata && 'seo' in metadata ? (metadata.seo as ArticleRevisionSeoMetadata) : {}

  return {
    title: `${title}`,
    description: response?.revision?.description?.trim() || 'Private article',
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nocache: true,
      noimageindex: true,
    },
    openGraph: {
      title: `${seoData?.metaTitle || title}`,
      description: seoData?.metaDescription || response?.revision?.description?.trim() || 'Private article preview',
      images: [seoData?.ogImageUrl || response?.revision?.thumbnailUrl || ''],
    },
    twitter: {
      card: seoData?.twitterCard || 'summary_large_image',
      title: `${seoData?.metaTitle || title} (Preview)`,
      description: seoData?.metaDescription || response?.revision?.description?.trim() || 'Private article preview',
      images: [seoData?.ogImageUrl || response?.revision?.thumbnailUrl || ''],
    },
  }
}

const PrivateArticleRoot = async (props: PageProps<{ slug: string[] }>) => {
  const params = await props.params

  if (!params.slug) {
    return notFound()
  }

  const response = await getServerForPublicArticle(params.slug?.[0] ?? '')

  if (!response) {
    return notFound()
  }

  if (response.article.visibility === ArticleVisibility.PUBLIC && response.article.slug) {
    return redirect(`/article/${response.article.slug}`)
  }

  if (response.article.visibility === ArticleVisibility.PRIVATE) {
    const roles = response.article.allowedRoles ?? []

    await defaultGuard({
      ...props,
      segments: [''],
      fallbackNavigatePath: '/',
      roles,
      fallbackRolesNavigatePath: { [UserRole.USER]: '/' },
    })
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

export default PrivateArticleRoot
