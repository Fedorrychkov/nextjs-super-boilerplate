/* eslint-disable react-refresh/only-export-components */
import type { Article, BreadcrumbList, FAQPage, Organization, Person, SoftwareApplication, WebSite, WithContext } from 'schema-dts'

import { jsonStringifySafety } from '~/utils/jsonSafe'

import type { RouteKey } from '../routes/seo'
import { buildBreadcrumbJsonLdItems } from '../routes/seo'
import { toAbsoluteSiteUrl } from './absoluteUrl'
import { seoConfig } from './config'

export const getOrganizationJsonLd = (): WithContext<Organization> => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: seoConfig.siteName,
  url: seoConfig.siteUrl,
  ...(seoConfig.organizationSameAs.length ? { sameAs: seoConfig.organizationSameAs } : {}),
})

export const getWebSiteJsonLd = (): WithContext<WebSite> => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: seoConfig.siteName,
  url: seoConfig.siteUrl,
  inLanguage: seoConfig.defaultLocale,
})

export const getPersonJsonLd = (): WithContext<Person> | null => {
  if (!seoConfig.schema.person || !seoConfig.author) {
    return null
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: seoConfig.author.name,
    url: seoConfig.author.url,
    ...(seoConfig.organizationSameAs.length ? { sameAs: seoConfig.organizationSameAs } : {}),
  }
}

export const getSoftwareApplicationJsonLd = (description: string): WithContext<SoftwareApplication> | null => {
  const github = seoConfig.links.github

  if (!seoConfig.schema.softwareApplication || !github) {
    return null
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: seoConfig.siteName,
    description,
    url: seoConfig.siteUrl,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    installUrl: github,
    sameAs: github,
    isAccessibleForFree: true,
    license: `${github}/blob/main/LICENSE`,
  }
}

export const getArticleJsonLd = (props: {
  slug: string
  title: string
  description?: string | null
  image?: string | null
  datePublished?: string | null
  dateModified?: string | null
  /** Absolute canonical URL — must match `alternates.canonical` / metadata. */
  canonicalUrl: string
  keywords?: string | null
  language?: string | null
  /** Public articles: true; private / restricted: false. */
  isAccessibleForFree?: boolean
}): WithContext<Article> => {
  const publisher: Organization = {
    '@type': 'Organization',
    name: seoConfig.siteName,
    url: seoConfig.siteUrl,
    ...(seoConfig.organizationSameAs.length ? { sameAs: seoConfig.organizationSameAs } : {}),
  }

  const author =
    seoConfig.author != null
      ? ({
          '@type': 'Person' as const,
          name: seoConfig.author.name,
          url: seoConfig.author.url,
        } satisfies Person)
      : publisher

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${props.canonicalUrl}#article`,
    url: props.canonicalUrl,
    mainEntityOfPage: props.canonicalUrl,
    headline: props.title,
    description: props.description ?? undefined,
    image: toAbsoluteSiteUrl(props.image ?? undefined),
    datePublished: props.datePublished ?? undefined,
    dateModified: props.dateModified ?? undefined,
    ...(props.keywords?.trim() ? { keywords: props.keywords.trim() } : {}),
    ...(props.isAccessibleForFree !== undefined ? { isAccessibleForFree: props.isAccessibleForFree } : {}),
    author,
    publisher,
    inLanguage: props.language?.trim() || seoConfig.defaultLocale,
  }
}

export const getArticleBreadcrumbJsonLd = (params: {
  articleName: string
  canonicalUrl: string
  labels?: Partial<Record<RouteKey, string>>
  /** @deprecated Prefer `labels` built from route `tKey`s */
  homeLabel?: string
  articlesLabel?: string
}): WithContext<BreadcrumbList> => {
  const labels: Partial<Record<RouteKey, string>> = {
    ...params.labels,
    ...(params.homeLabel ? { home: params.homeLabel } : {}),
    ...(params.articlesLabel ? { articlesPublic: params.articlesLabel } : {}),
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: buildBreadcrumbJsonLdItems({
      labels,
      terminal: { name: params.articleName, item: params.canonicalUrl },
      baseUrl: seoConfig.siteUrl,
    }),
  }
}

export const getFaqPageJsonLd = (items: { question: string; answer: string }[]): WithContext<FAQPage> => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
})

export const JsonLd = ({ data }: { data: unknown }) => (
  <script type="application/ld+json" suppressHydrationWarning>
    {jsonStringifySafety(data) ?? '{}'}
  </script>
)
