/**
 * The "live demo" link only makes sense when it leads somewhere else. On the demo deployment
 * itself `links.demo` equals the site's own URL, and a header button that opens the same page in
 * a new tab reads as a bug. Same-origin demo → no external link (the layout falls back to its
 * in-app CTA). An unparsable value is returned as is: better a visible link than a silent drop.
 */
export function externalDemoUrl(demo: string | null | undefined, siteUrl: string | null | undefined): string | null {
  const trimmed = demo?.trim()

  if (!trimmed) {
    return null
  }

  try {
    const demoOrigin = new URL(trimmed).origin
    const siteOrigin = siteUrl?.trim() ? new URL(siteUrl.trim()).origin : ''

    return demoOrigin === siteOrigin ? null : trimmed
  } catch {
    return trimmed
  }
}
