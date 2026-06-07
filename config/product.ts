/**
 * Product identity — single place to customize after forking.
 * URLs for deployment stay in env (`NEXT_PUBLIC_SITE_URL`); SEO/PWA/schema read from here.
 *
 * Set `author: null` and `schema.person: false` for products without a public author persona.
 * Set `links.github: null` and `schema.softwareApplication: false` when not an open-source boilerplate.
 */

export type ProductAuthor = {
  name: string
  url: string
}

export type ProductLinks = {
  github?: string | null
  demo?: string | null
}

export type ProductSitemapExtra = {
  path: string
  priority: number
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
}

export const PRODUCT_CONFIG = {
  name: 'Production Ready Next.js Boilerplate',
  shortName: 'Next.js Boilerplate',
  description: 'Production-ready Next.js starter with auth, SEO, RUM and AI referral tracking',
  defaultTitle: 'Production Ready Next.js Boilerplate',

  /** Public author for articles / Person schema. `null` → Organization-only publisher. */
  author: {
    name: 'Fedor Rychkov',
    url: 'https://github.com/Fedorrychkov',
  } satisfies ProductAuthor,

  /** Marketing / repo links (homepage, SoftwareApplication schema). */
  links: {
    github: 'https://github.com/Fedorrychkov/nextjs-super-boilerplate',
    demo: 'https://nextjs-super-boilerplate.visn-ai.io',
  } satisfies ProductLinks,

  /** Which optional JSON-LD blocks to emit on the homepage. */
  schema: {
    person: true,
    softwareApplication: true,
  },

  pwa: {
    themeColor: '#0f172a',
    backgroundColor: '#0f172a',
    display: 'standalone' as const,
    orientation: 'portrait' as const,
    icons: [
      { src: '/images/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/images/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  },

  /** Static paths not defined in `routes.ts` (feeds, verification-adjacent URLs, etc.). */
  sitemapExtras: [{ path: '/rss.xml', priority: 0.6, changeFrequency: 'daily' as const }] satisfies ProductSitemapExtra[],
} as const
