import { seoConfig } from './config'

/** Makes `og:image`, JSON-LD `image`, etc. absolute when stored as `/path` or CDN-relative. */
export function toAbsoluteSiteUrl(pathOrUrl: string | null | undefined): string | undefined {
  if (pathOrUrl == null) return undefined
  const raw = String(pathOrUrl).trim()

  if (!raw) return undefined

  if (/^https?:\/\//i.test(raw)) return raw
  const base = seoConfig.siteUrl.replace(/\/+$/, '')
  const path = raw.startsWith('/') ? raw : `/${raw}`

  return `${base}${path}`
}
