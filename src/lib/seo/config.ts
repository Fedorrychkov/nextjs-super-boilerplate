import { NEXT_PUBLIC_ORGANIZATION_SAME_AS, NEXT_PUBLIC_SITE_URL } from '@config/env'
import { PRODUCT_CONFIG } from '@config/product'

import { getDefaultLocale } from '../i18n'
import { externalDemoUrl } from './external-demo'

function parseOrganizationSameAs(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return []
  }

  return raw
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url.length > 0)
}

export const seoConfig = {
  siteName: PRODUCT_CONFIG.name,
  siteUrl: NEXT_PUBLIC_SITE_URL,
  defaultTitle: PRODUCT_CONFIG.defaultTitle,
  defaultDescription: PRODUCT_CONFIG.description,
  defaultLocale: getDefaultLocale(),
  organizationSameAs: parseOrganizationSameAs(NEXT_PUBLIC_ORGANIZATION_SAME_AS),
  author: PRODUCT_CONFIG.author,
  links: PRODUCT_CONFIG.links,
  /** `links.demo` unless it is this very site — then there is nothing external to link to. */
  externalDemoUrl: externalDemoUrl(PRODUCT_CONFIG.links.demo, NEXT_PUBLIC_SITE_URL),
  schema: {
    person: PRODUCT_CONFIG.schema.person && Boolean(PRODUCT_CONFIG.author),
    softwareApplication: PRODUCT_CONFIG.schema.softwareApplication && Boolean(PRODUCT_CONFIG.links.github),
  },
}
