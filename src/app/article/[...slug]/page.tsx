import '../../../components/Blocks/Editor/styles/editor.styles.scss'

import { PageProps } from '@lib/page'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

import { ArticleVisibility } from '~/api/article'
import { ArticleRevisionSeoMetadata } from '~/api/article-revision'
import { ArticlePublishedDate } from '~/components/Views/Article/Block/server/ArticlePublishedDate'
import { ArticlePublicListenAudio } from '~/components/Views/Article/Public/ArticlePublicListenAudio'
import { ArticleReadingShell } from '~/components/Views/Article/Public/ArticleReadingShell'
import { ArticleTranslationAcceptBanner } from '~/components/Views/Article/Public/ArticleTranslationAcceptBanner'
import { ArticleTranslationLanguageNav } from '~/components/Views/Article/Public/ArticleTranslationLanguageNav'
import { ArticleViewTracker } from '~/components/Views/Article/Public/ArticleViewTracker'
import { FALLBACK_THUMBNAIL_IMAGE } from '~/constants'
import { getCachedPublicArticlePagePayload } from '~/lib/cache/publicArticlePageCache'
import { getServerT } from '~/lib/i18n/server'
import { toAbsoluteSiteUrl } from '~/lib/seo/absoluteUrl'
import { pickPreferredTranslationFromAcceptLanguage } from '~/lib/seo/acceptLanguageTranslationSuggest'
import { getAlternateOgLocale, resolveArticleLanguage, toOgLocale } from '~/lib/seo/articleLanguage'
import { resolvePublicArticlePageMeta } from '~/lib/seo/articleMeta'
import {
  loadPublishedIndexableAlternatesLanguagesMap,
  loadPublishedIndexableTranslationMembers,
  resolvePublishedArticleHreflangKey,
} from '~/lib/seo/articleTranslationAlternates'
import { seoConfig } from '~/lib/seo/config'
import { getArticleBreadcrumbJsonLd, getArticleJsonLd, JsonLd } from '~/lib/seo/jsonld'
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
  const articleLanguage = resolveArticleLanguage(seoData?.language)

  const meta = resolvePublicArticlePageMeta({
    slug,
    revision: response.revision ?? {},
    article: response.article ?? { slug, visibility: ArticleVisibility.PUBLIC },
    seo: seoData,
  })

  /** Align `<title>`, JSON-LD `headline`, and OG/Twitter titles (GEO / rich-result consistency). */
  const canonicalTitle = meta.title
  const publishedAt = response.revision.publishedAt ?? response.article.publishedAt
  const modifiedAt = response.revision.updatedAt ?? response.article.updatedAt
  const ogImage = toAbsoluteSiteUrl(meta.image)

  const translationLanguages = await loadPublishedIndexableAlternatesLanguagesMap(response.article.translationGroupId ?? undefined)
  const author = seoConfig.author

  return {
    title: canonicalTitle,
    description: meta.description,
    alternates: {
      canonical: meta.canonical,
      ...(translationLanguages && Object.keys(translationLanguages).length >= 2 ? { languages: translationLanguages } : {}),
    },
    robots: {
      index: seoData?.noindex !== true,
      /** Public demo articles: pass link equity to cited resources; use editor only if you truly need nofollow. */
      follow: true,
      noarchive: false,
      nocache: false,
      noimageindex: false,
    },
    openGraph: {
      type: 'article',
      url: meta.canonical,
      title: canonicalTitle,
      description: meta.ogDescription,
      images: ogImage ? [{ url: ogImage }] : undefined,
      locale: toOgLocale(articleLanguage),
      alternateLocale: [getAlternateOgLocale(articleLanguage)],
      publishedTime: publishedAt ?? undefined,
      modifiedTime: modifiedAt ?? undefined,
      ...(author ? { authors: [author.url] } : {}),
    },
    twitter: {
      card: seoData?.twitterCard || 'summary_large_image',
      title: canonicalTitle,
      description: meta.ogDescription,
      images: ogImage ? [ogImage] : undefined,
    },
    other: {
      'article:language': articleLanguage,
      ...(publishedAt ? { 'article:published_time': publishedAt } : {}),
      ...(modifiedAt ? { 'article:modified_time': modifiedAt } : {}),
      ...(author ? { 'article:author': author.url } : {}),
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
  const articleLanguage = resolveArticleLanguage(seoJson.language)
  const pageMeta = resolvePublicArticlePageMeta({
    slug: slugResolved,
    revision: response.revision,
    article: response.article,
    seo: seoJson,
  })

  const { locale, t } = await getServerT()
  const hdrs = await headers()
  const acceptLanguage = hdrs.get('accept-language')

  const translationMembers = await loadPublishedIndexableTranslationMembers(response.article.translationGroupId ?? undefined)
  const currentHreflangKey = resolvePublishedArticleHreflangKey(response.article.locale, seoJson.language)
  const bannerTarget =
    translationMembers.length >= 2 ? pickPreferredTranslationFromAcceptLanguage(translationMembers, slugResolved, currentHreflangKey, acceptLanguage) : null
  const translationGroupId = response.article.translationGroupId?.trim() ?? ''

  const languageDisplayName = (code: string) => new Intl.DisplayNames([locale], { type: 'language' }).of(code) ?? code.toUpperCase()

  const canonicalTitle = pageMeta.title

  const articleJsonLd = getArticleJsonLd({
    slug: slugResolved,
    title: canonicalTitle,
    description: response.revision.description,
    image: response.revision.thumbnailUrl || FALLBACK_THUMBNAIL_IMAGE,
    datePublished: response.revision.publishedAt ?? response.article.publishedAt,
    dateModified: response.revision.updatedAt ?? response.article.updatedAt,
    canonicalUrl: pageMeta.canonical,
    keywords: seoJson.keywords,
    language: articleLanguage,
    isAccessibleForFree: true,
  })

  const breadcrumbJsonLd = getArticleBreadcrumbJsonLd({
    articleName: canonicalTitle,
    canonicalUrl: pageMeta.canonical,
    labels: {
      home: t('navigation.home'),
      articlesPublic: t('navigation.articlesPublic'),
    },
  })

  const publishedAt = response.revision.publishedAt ?? response.article.publishedAt

  const thumbnailUrl = response.revision.thumbnailUrl || null

  return (
    <>
      <ArticleViewTracker slug={slugResolved} surface="public" />
      <JsonLd data={breadcrumbJsonLd} />
      <JsonLd data={articleJsonLd} />

      <ArticleReadingShell
        breadcrumbs={[{ label: t('navigation.home'), href: '/' }, { label: t('navigation.articlesPublic'), href: '/articles' }, { label: canonicalTitle }]}
        title={canonicalTitle}
        thumbnailUrl={thumbnailUrl}
        articleLanguage={articleLanguage}
        bodyHtml={bodyHtml}
        backLink={{ label: t('navigation.articlesPublic'), href: '/articles' }}
        banners={
          <>
            {translationMembers.length >= 2 ? (
              <ArticleTranslationLanguageNav
                ariaLabel={t('article.public.translationLanguagesNavAria')}
                items={translationMembers.map((m) => ({
                  hreflangKey: m.hreflangKey,
                  url: m.canonicalUrl,
                  isCurrent: m.slug === slugResolved,
                }))}
              />
            ) : null}
            {bannerTarget && translationGroupId ? (
              <ArticleTranslationAcceptBanner
                storageKey={`translation-banner-dismissed:${translationGroupId}`}
                suggestedUrl={bannerTarget.canonicalUrl}
                leadLabel={t('article.public.translationBannerLead', { language: languageDisplayName(bannerTarget.hreflangKey) })}
                openButtonLabel={t('article.public.translationOpenIn', { language: languageDisplayName(bannerTarget.hreflangKey) })}
                laterLabel={t('article.public.translationNotNow')}
                regionAriaLabel={t('article.public.translationBannerAria')}
              />
            ) : null}
          </>
        }
        meta={
          <>
            {seoConfig.author ? (
              <span>
                <span className="mr-1">{t('article.ui.authorBylinePrefix')}</span>
                <a
                  href={seoConfig.author.url}
                  rel="author noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
                >
                  {seoConfig.author.name}
                </a>
              </span>
            ) : null}
            <ArticlePublishedDate publishedAt={publishedAt} />
            <ArticlePublicListenAudio assetId={response.article.listenAudioAssetId} />
          </>
        }
      />
    </>
  )
}

export default ArticlePublicRoot
