/**
 * `nextPath` comes from the query string and ends up in a navigation: `router.replace`,
 * `redirect()`, `NextResponse.redirect(new URL(nextPath, siteBase))`. Anything that resolves
 * outside our origin is an open redirect — `//evil.example`, `/\evil.example`, an absolute URL,
 * a percent-encoded `%2F%2F`. The path is validated by actually resolving it against a fixed
 * origin: if the origin changes, the value is not a path. Shared by client and server code,
 * so no Node imports here.
 */
const PROBE_ORIGIN = 'http://internal.invalid'

export function safeInternalPath(value: string | null | undefined, fallback: string): string {
  const raw = value?.trim() ?? ''

  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return fallback
  }

  let decoded: string

  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return fallback
  }

  if (decoded.startsWith('//') || decoded.startsWith('/\\') || /[\r\n\0]/.test(decoded)) {
    return fallback
  }

  try {
    const resolved = new URL(raw, PROBE_ORIGIN)

    if (resolved.origin !== PROBE_ORIGIN) {
      return fallback
    }

    return `${resolved.pathname}${resolved.search}${resolved.hash}`
  } catch {
    return fallback
  }
}

/** `path?nextPath=<encoded>`: the value is a path with its own query, so it must be encoded, not glued. */
export function withNextPath(path: string, nextPath: string): string {
  const params = new URLSearchParams({ nextPath })

  return `${path}?${params.toString()}`
}
