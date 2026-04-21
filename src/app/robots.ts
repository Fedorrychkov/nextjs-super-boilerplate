import { NEXT_PUBLIC_SITE_URL } from '@config/env'
import type { MetadataRoute } from 'next'

const siteUrl = NEXT_PUBLIC_SITE_URL

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/logout', '/login', '/refresh', '/profile', '/admin/', '/private-article/', '/preview/'],
      },
      {
        userAgent: 'YandexBot',
        allow: '/',
      },
      {
        userAgent: 'GPTBot',
        allow: '/',
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
      },
      {
        userAgent: 'Google-Extended',
        allow: '/',
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
      },
    ],
    /** Regular sitemap from `app/sitemap.xml/route.ts`. News sitemap (Google News XML) — separate format; add URL here only if you implement `sitemap-news.xml`. */
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
