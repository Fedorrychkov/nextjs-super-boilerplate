import { NEXT_PUBLIC_ORGANIZATION_SAME_AS, NEXT_PUBLIC_SITE_URL } from '@config/env'

import { getDefaultLocale } from '../i18n'

const FALLBACK_SITE_URL = NEXT_PUBLIC_SITE_URL

export const seoConfig = {
  siteName: 'Production Ready Next.js Boilerplate',
  siteUrl: FALLBACK_SITE_URL,
  defaultTitle: 'Production Ready Next.js Boilerplate',
  defaultDescription: 'You can use this boilerplate to start your best next project',
  defaultLocale: getDefaultLocale(),
  organizationSameAs:
    NEXT_PUBLIC_ORGANIZATION_SAME_AS?.split(',')
      ?.map((url) => url.trim())
      ?.filter((url) => url.length > 0) ?? ([] as string[]),
}
