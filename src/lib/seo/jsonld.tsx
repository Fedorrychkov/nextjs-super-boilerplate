/* eslint-disable react-refresh/only-export-components */
import type { Organization, WebSite, WithContext } from 'schema-dts'

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

export const JsonLd = ({ data }: { data: unknown }) => (
  <script type="application/ld+json" suppressHydrationWarning>
    {JSON.stringify(data)}
  </script>
)
