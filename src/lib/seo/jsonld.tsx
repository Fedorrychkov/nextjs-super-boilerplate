/* eslint-disable react-refresh/only-export-components */
import type { Article, FAQPage, Organization, Person, SoftwareApplication, WebSite, WithContext } from 'schema-dts'

import { jsonStringifySafety } from '~/utils/jsonSafe'

import { AUTHOR_GITHUB_URL, AUTHOR_NAME, BOILERPLATE_GITHUB_REPO_URL, seoConfig } from './config'

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

/** Open-source boilerplate as a software product (homepage rich result / entity hints). */
export const getPersonJsonLd = (): WithContext<Person> => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: AUTHOR_NAME,
  url: AUTHOR_GITHUB_URL,
  ...(seoConfig.organizationSameAs.length ? { sameAs: seoConfig.organizationSameAs } : {}),
})

export const getSoftwareApplicationJsonLd = (description: string): WithContext<SoftwareApplication> => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: seoConfig.siteName,
  description,
  url: seoConfig.siteUrl,
  applicationCategory: 'DeveloperApplication',
  operatingSystem: 'Any',
  installUrl: BOILERPLATE_GITHUB_REPO_URL,
  sameAs: BOILERPLATE_GITHUB_REPO_URL,
  isAccessibleForFree: true,
  license: `${BOILERPLATE_GITHUB_REPO_URL}/blob/main/LICENSE`,
})

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
}): WithContext<Article> => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  '@id': `${props.canonicalUrl}#article`,
  url: props.canonicalUrl,
  mainEntityOfPage: props.canonicalUrl,
  headline: props.title,
  description: props.description ?? undefined,
  image: props.image ?? undefined,
  datePublished: props.datePublished ?? undefined,
  dateModified: props.dateModified ?? undefined,
  ...(props.keywords?.trim() ? { keywords: props.keywords.trim() } : {}),
  ...(props.isAccessibleForFree !== undefined ? { isAccessibleForFree: props.isAccessibleForFree } : {}),
  author: {
    '@type': 'Person',
    name: AUTHOR_NAME,
    url: AUTHOR_GITHUB_URL,
  },
  publisher: {
    '@type': 'Organization',
    name: seoConfig.siteName,
    url: seoConfig.siteUrl,
    ...(seoConfig.organizationSameAs.length ? { sameAs: seoConfig.organizationSameAs } : {}),
  },
  inLanguage: props.language?.trim() || seoConfig.defaultLocale,
})

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
