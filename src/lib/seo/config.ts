import { NEXT_PUBLIC_ORGANIZATION_SAME_AS, NEXT_PUBLIC_SITE_URL } from '@config/env'

import { getDefaultLocale } from '../i18n'

const FALLBACK_SITE_URL = NEXT_PUBLIC_SITE_URL

/** Canonical GitHub repository for this boilerplate (SEO, JSON-LD, homepage links). */
export const BOILERPLATE_GITHUB_REPO_URL = 'https://github.com/Fedorrychkov/nextjs-super-boilerplate' as const

/** Public demo instance (see README); use for marketing links — set your own when forking. */
export const BOILERPLATE_DEMO_URL = 'https://nextjs-super-boilerplate.visn-ai.io' as const

/** Single author for public articles / JSON-LD (demo site). */
export const AUTHOR_NAME = 'Fedor Rychkov' as const
export const AUTHOR_GITHUB_URL = 'https://github.com/Fedorrychkov' as const

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
