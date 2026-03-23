import { seoConfig } from '~/lib/seo/config'
import { getPublishedPublicArticlesForSeo } from '~/lib/seo/sitemap'

/** Disable prerendering of rss.xml on `next build` without Mongo */
export const dynamic = 'force-dynamic'

const escapeXml = (input?: string | null) =>
  (input ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

const generateRss = async () => {
  const articles = await getPublishedPublicArticlesForSeo()

  const items = articles.map((article) => {
    const url = `${seoConfig.siteUrl}/article/${article.slug}`
    const title = escapeXml(article.title || article.slug)
    const description = escapeXml(article.description || '')
    const pubDate = article.publishedAt ? new Date(article.publishedAt).toUTCString() : undefined
    const lastUpdated = article.updatedAt ? new Date(article.updatedAt).toUTCString() : undefined

    return `<item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      ${description ? `<description>${description}</description>` : ''}
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
      ${lastUpdated ? `<lastBuildDate>${lastUpdated}</lastBuildDate>` : ''}
    </item>`
  })

  return `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>${seoConfig.siteName}</title>
    <link>${seoConfig.siteUrl}</link>
    <description>${seoConfig.defaultDescription}</description>
    ${items.join('\n')}
  </channel>
</rss>`
}

export const GET = async () => {
  const xml = await generateRss()

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
    },
  })
}
