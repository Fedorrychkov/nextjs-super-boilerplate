import '../../../components/Blocks/Editor/styles/editor.styles.scss'

import { defaultGuard, PageProps } from '@lib/page'
import { getServerArticle } from '@lib/server-action/server-article'
import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { UserRole } from '~/api/user'
import { defaultExtensions } from '~/components/Blocks/Editor/extensions'
import { finalizeArticleBodyHtml } from '~/lib/editor/finalizeArticleBodyHtml'
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

  return {
    title: `${title} (Preview)`,
    description: response?.revision?.description?.trim() || 'Private article preview',
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

  return <div className="max-w-full tiptap readonly" dangerouslySetInnerHTML={{ __html: generatedPageString }} />
}

export default PreviewRoot
