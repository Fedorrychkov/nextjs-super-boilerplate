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
        userAgent: 'GPTBot',
        allow: '/',
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
      },
    ],
    /** Обычный sitemap из `app/sitemap.ts`. News sitemap (Google News XML) — отдельный формат; добавь URL сюда только если реализуешь `sitemap-news.xml`. */
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
