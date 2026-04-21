import type { MetadataRoute } from 'next'

const XHTML_NS = 'http://www.w3.org/1999/xhtml'
const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'

/** XML 1.0 — strip disallowed control chars. */
function stripIllegalXmlChars(s: string): string {
  return s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
}

function toXmlText(value: unknown): string {
  if (value == null) {
    return ''
  }

  if (typeof value === 'string') {
    return stripIllegalXmlChars(value)
  }

  if (typeof URL !== 'undefined' && value instanceof URL) {
    return stripIllegalXmlChars(value.href)
  }

  return stripIllegalXmlChars(String(value))
}

function escapeXml(input: string): string {
  return input.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function escapeXmlValue(value: unknown): string {
  return escapeXml(toXmlText(value))
}

function toIsoLastMod(value: string | Date | undefined): string | null {
  if (value == null) {
    return null
  }

  const date = typeof value === 'string' ? new Date(value) : value

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

/** BCP47 / x-default — без кавычек, угловых скобок, пробелов. */
function isSafeHreflangToken(s: string): boolean {
  if (!s || s.length > 42) {
    return false
  }

  return !/["'&<>\s]/.test(s)
}

function isHttpUrl(s: string): boolean {
  return /^https?:\/\//i.test(s.trim())
}

/** Нормализует абсолютный URL (убирает лишнее, приводит к каноническому виду `URL.href`). */
function normalizeHttpUrl(raw: string): string | null {
  const t = raw.trim()

  if (!t || !isHttpUrl(t)) {
    return null
  }

  try {
    const u = new URL(t)

    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return null
    }

    return u.href
  } catch {
    return null
  }
}

/**
 * Sitemap 0.9 + hreflang per Google’s multilingual sitemap pattern:
 * `urlset` with `xmlns` + `xmlns:xhtml`, each `url` has `loc`, then `xhtml:link` alternates, then optional `lastmod` / `changefreq` / `priority`.
 *
 * When alternates exist, `xmlns:xhtml` is also set on `url` so `xhtml:` is bound for that subtree (helps some XML viewers).
 */
export function buildSitemapXml(entries: MetadataRoute.Sitemap): string {
  const items = entries
    .map((entry) => {
      const locNorm = normalizeHttpUrl(toXmlText(entry.url))

      if (!locNorm) {
        return ''
      }

      const loc = escapeXml(locNorm)
      const lastmodRaw = toIsoLastMod(entry.lastModified)
      const lastmod = lastmodRaw ? escapeXmlValue(lastmodRaw) : null
      const changefreq = entry.changeFrequency != null ? escapeXmlValue(entry.changeFrequency) : null
      const priority = entry.priority != null ? escapeXmlValue(String(entry.priority)) : null

      const languagesRaw = entry.alternates?.languages

      const languages =
        languagesRaw && typeof languagesRaw === 'object' && !Array.isArray(languagesRaw) ? (languagesRaw as Record<string, string | URL | undefined>) : null

      const alternateParts: string[] = []

      if (languages) {
        const keys = Object.keys(languages)

        for (const lang of keys) {
          const rawLang = toXmlText(lang).trim()

          if (!rawLang || !isSafeHreflangToken(rawLang)) {
            continue
          }

          const hrefNorm = normalizeHttpUrl(toXmlText(languages[lang]))

          if (!hrefNorm) {
            continue
          }

          const langKey = escapeXml(rawLang)
          const hrefEsc = escapeXml(hrefNorm)
          alternateParts.push(`\n    <xhtml:link rel="alternate" hreflang="${langKey}" href="${hrefEsc}" />`)
        }
      }

      const alternateLinks = alternateParts.join('')
      const lastmodBlock = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
      const changefreqBlock = changefreq ? `\n    <changefreq>${changefreq}</changefreq>` : ''
      const priorityBlock = priority ? `\n    <priority>${priority}</priority>` : ''

      const urlTag = alternateLinks.length > 0 ? `  <url xmlns:xhtml="${escapeXml(XHTML_NS)}">` : '  <url>'

      return `${urlTag}
    <loc>${loc}</loc>${alternateLinks}${lastmodBlock}${changefreqBlock}${priorityBlock}
  </url>`
    })
    .filter(Boolean)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="${escapeXml(SITEMAP_NS)}" xmlns:xhtml="${escapeXml(XHTML_NS)}">
${items}
</urlset>`
}
