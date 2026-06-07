import { PRODUCT_CONFIG } from '@config/product'
import type { MetadataRoute } from 'next'

import { type AppRoute, routes } from '~/constants/routes'

type SitemapFrequency = NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>

export type RouteKey = keyof typeof routes

const routeEntries = Object.entries(routes) as [RouteKey, AppRoute][]

/** Public routes flagged with `seo.sitemap`, sorted by priority (desc). */
export function getSitemapRoutesFromConfig(baseUrl: string): MetadataRoute.Sitemap {
  const base = baseUrl.replace(/\/+$/, '')

  const fromRoutes = routeEntries
    .filter((entry): entry is [RouteKey, AppRoute & { seo: NonNullable<AppRoute['seo']> }] => Boolean(entry[1].seo?.sitemap))
    .map(([, route]) => {
      const sitemap = route.seo.sitemap!

      return {
        url: `${base}${route.path}`,
        lastModified: new Date(),
        changeFrequency: sitemap.changeFrequency as SitemapFrequency,
        priority: sitemap.priority,
      }
    })

  const extras = PRODUCT_CONFIG.sitemapExtras.map((extra) => ({
    url: `${base}${extra.path}`,
    lastModified: new Date(),
    changeFrequency: extra.changeFrequency as SitemapFrequency,
    priority: extra.priority,
  }))

  return [...fromRoutes, ...extras].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
}

/** Breadcrumb chain for public content (ordered by `seo.breadcrumbOrder`). */
export function getBreadcrumbRouteKeys(): RouteKey[] {
  return routeEntries
    .filter((entry): entry is [RouteKey, AppRoute & { seo: NonNullable<AppRoute['seo']> }] => Boolean(entry[1].seo?.breadcrumb))
    .sort((a, b) => (a[1].seo.breadcrumbOrder ?? 99) - (b[1].seo.breadcrumbOrder ?? 99))
    .map(([key]) => key)
}

export function buildBreadcrumbJsonLdItems(params: { labels: Partial<Record<RouteKey, string>>; terminal: { name: string; item: string }; baseUrl: string }) {
  const base = params.baseUrl.replace(/\/+$/, '')
  const chain = getBreadcrumbRouteKeys()

  const items = chain.map((key, index) => {
    const route = routes[key]

    return {
      '@type': 'ListItem' as const,
      position: index + 1,
      name: params.labels[key] ?? route.name,
      item: `${base}${route.path}`,
    }
  })

  items.push({
    '@type': 'ListItem',
    position: items.length + 1,
    name: params.terminal.name,
    item: params.terminal.item,
  })

  return items
}
