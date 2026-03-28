/**
 * Whether `Accept` prefers `text/markdown` over `text/html` (and `application/xhtml+xml`).
 * Used for Cloudflare-style Markdown negotiation on the same URL as the public article page.
 */
export function preferMarkdownAccept(acceptHeader: string | null): boolean {
  if (!acceptHeader?.trim()) {
    return false
  }

  const items: { type: string; q: number; index: number }[] = []
  let index = 0

  for (const raw of acceptHeader.split(',')) {
    const part = raw.trim()

    if (!part) {
      continue
    }

    const [typePart, ...params] = part.split(';').map((s) => s.trim().toLowerCase())

    if (!typePart) {
      continue
    }

    let q = 1

    for (const p of params) {
      const [k, v] = p.split('=').map((s) => s.trim())

      if (k === 'q' && v !== undefined) {
        const n = Number.parseFloat(v)

        if (Number.isFinite(n)) {
          q = Math.min(1, Math.max(0, n))
        }
      }
    }

    items.push({ type: typePart, q, index })
    index += 1
  }

  const md = items.filter((i) => i.type === 'text/markdown' || i.type === 'text/x-markdown')
  const html = items.filter((i) => i.type === 'text/html' || i.type === 'application/xhtml+xml')

  if (md.length === 0) {
    return false
  }

  const maxMd = Math.max(...md.map((i) => i.q))
  const maxHtml = html.length === 0 ? 0 : Math.max(...html.map((i) => i.q))

  if (maxMd > maxHtml) {
    return true
  }

  if (maxMd < maxHtml) {
    return false
  }

  const firstMd = Math.min(...md.map((i) => i.index))
  const firstHtml = html.length === 0 ? Infinity : Math.min(...html.map((i) => i.index))

  return firstMd < firstHtml
}
