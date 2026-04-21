import { getPublishedPublicSitemapRoutes, getStaticRoutes } from '~/lib/seo/sitemap'
import { buildSitemapXml } from '~/lib/seo/sitemapXml'
import { Logger } from '~/utils/logger'

const logger = new Logger(['SitemapXmlRoute', '[src/app/sitemap.xml/route.ts]'])

/** Same as former `app/sitemap.ts`: do not assume DB at build time. */
export const dynamic = 'force-dynamic'

export const GET = async () => {
  try {
    const staticRoutes = getStaticRoutes()
    const articleRoutes = await getPublishedPublicSitemapRoutes()
    const xml = buildSitemapXml([...staticRoutes, ...articleRoutes])

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
      },
    })
  } catch (error) {
    logger.error(error)

    const xml = buildSitemapXml(getStaticRoutes())

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=60',
      },
    })
  }
}
