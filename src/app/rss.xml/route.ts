import { ArticleVisibility } from '~/api/article'
import { buildDefaultArticleUrl } from '~/lib/seo/articleCanonical'
import { seoConfig } from '~/lib/seo/config'
import { getPublishedPublicArticlesForSeo } from '~/lib/seo/sitemap'

/** Disable prerendering of rss.xml on `next build` without Mongo */
export const dynamic = 'force-dynamic'

const escapeXml = (input?: string | null) =>
  (input ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

const generateRss = async () => {
  const articles = await getPublishedPublicArticlesForSeo()
  const lastBuildDate = articles
    .map((article) => {
      const updatedAt = article.updatedAt ? new Date(article.updatedAt).getTime() : 0
      const publishedAt = article.publishedAt ? new Date(article.publishedAt).getTime() : 0

      return Math.max(updatedAt, publishedAt)
    })
    .reduce((max, current) => Math.max(max, current), 0)

  const items = articles.map((article) => {
    const url = buildDefaultArticleUrl(seoConfig.siteUrl, article.slug, ArticleVisibility.PUBLIC)
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
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${seoConfig.siteName}</title>
    <link>${seoConfig.siteUrl}</link>
    <description>${seoConfig.defaultDescription}</description>
    <language>${seoConfig.defaultLocale}</language>
    <atom:link href="${seoConfig.siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    ${lastBuildDate ? `<lastBuildDate>${new Date(lastBuildDate).toUTCString()}</lastBuildDate>` : ''}
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
