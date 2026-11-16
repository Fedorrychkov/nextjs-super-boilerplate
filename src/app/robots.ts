import { NEXT_PUBLIC_SITE_URL } from '@config/env'
import type { MetadataRoute } from 'next'

const siteUrl = NEXT_PUBLIC_SITE_URL

const DISALLOW = ['/api/', '/logout', '/login', '/refresh', '/profile', '/admin/', '/private-article/', '/preview/']

/**
 * Named groups exist only to let a bot in explicitly. Each of them must carry the same disallow:
 * per RFC 9309 a crawler picks the ONE most specific group for itself and ignores `*` entirely —
 * an `allow: /` group on its own opened the private sections to every bot listed here.
 */
const NAMED_BOTS = ['YandexBot', 'GPTBot', 'PerplexityBot', 'Bingbot', 'Google-Extended', 'ClaudeBot']

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: DISALLOW }, ...NAMED_BOTS.map((userAgent) => ({ userAgent, allow: '/', disallow: DISALLOW }))],
    /** Regular sitemap from `app/sitemap.xml/route.ts`. News sitemap (Google News XML) — separate format; add URL here only if you implement `sitemap-news.xml`. */
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
