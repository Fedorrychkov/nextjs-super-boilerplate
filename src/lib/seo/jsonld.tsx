/* eslint-disable react-refresh/only-export-components */
import type { Article, Organization, WebSite, WithContext } from 'schema-dts'

import { seoConfig } from './config'

export const getOrganizationJsonLd = (): WithContext<Organization> => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: seoConfig.siteName,
  url: seoConfig.siteUrl,
})

export const getWebSiteJsonLd = (): WithContext<WebSite> => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: seoConfig.siteName,
  url: seoConfig.siteUrl,
  inLanguage: seoConfig.defaultLocale,
})

export const getArticleJsonLd = (props: {
  slug: string
  title: string
  description?: string | null
  image?: string | null
  datePublished?: string | null
  dateModified?: string | null
}): WithContext<Article> => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  mainEntityOfPage: `${seoConfig.siteUrl}/article/${props.slug}`,
  headline: props.title,
  description: props.description ?? undefined,
  image: props.image ?? undefined,
  datePublished: props.datePublished ?? undefined,
  dateModified: props.dateModified ?? undefined,
  author: {
    '@type': 'Organization',
    name: seoConfig.siteName,
    url: seoConfig.siteUrl,
  },
  publisher: {
    '@type': 'Organization',
    name: seoConfig.siteName,
    url: seoConfig.siteUrl,
  },
  inLanguage: seoConfig.defaultLocale,
})

export const JsonLd = ({ data }: { data: unknown }) => (
  <script type="application/ld+json" suppressHydrationWarning>
    {JSON.stringify(data)}
  </script>
)
