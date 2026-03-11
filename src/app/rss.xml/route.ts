import type { NextRequest } from 'next/server'

import { seoConfig } from '~/lib/seo/config'

const generateRss = () => {
  const items = [] as string[]

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

export const GET = async (_request: NextRequest) => {
  const xml = generateRss()

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
    },
  })
}
