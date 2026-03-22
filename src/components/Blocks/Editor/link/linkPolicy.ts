/**
 * General URL check for links in the editor (paste, setLink, autolink).
 * Must match the logic of Link.configure.isAllowedUri in useDefaultEditor.
 */
export type IsAllowedUriCtx = {
  defaultValidate: (url: string) => boolean
  protocols: Array<{ scheme: string; optionalSlashes?: boolean } | string>
  defaultProtocol: string
}

/** Unified context for Link.configure, paste and link dialog */
export const DEFAULT_LINK_URI_CTX: IsAllowedUriCtx = {
  defaultValidate: (url: string) => {
    try {
      new URL(url)

      return true
    } catch {
      return false
    }
  },
  protocols: ['http', 'https'],
  defaultProtocol: 'https',
}

export function isAllowedHref(url: string, ctx: IsAllowedUriCtx): boolean {
  try {
    const parsedUrl = url.includes(':') ? new URL(url) : new URL(`${ctx.defaultProtocol}://${url}`)

    if (!ctx.defaultValidate(parsedUrl.href)) {
      return false
    }

    const disallowedProtocols: string[] = ['ftp', 'file']
    const protocol = parsedUrl.protocol.replace(':', '')

    if (disallowedProtocols.includes(protocol)) {
      return false
    }

    const allowedProtocols = ctx.protocols.map((p) => (typeof p === 'string' ? p : p.scheme))

    if (!allowedProtocols.includes(protocol)) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/** Normalizes input to absolute href (https by default). */
export function normalizeUrlForLink(input: string, defaultProtocol = 'https'): string | null {
  const trimmed = input.trim()

  if (!trimmed) {
    return null
  }

  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `${defaultProtocol}://${trimmed}`
    const u = new URL(withProtocol)

    if (!u.hostname) {
      return null
    }

    return u.href
  } catch {
    return null
  }
}

export function isLikelyUrl(text: string): boolean {
  return normalizeUrlForLink(text) !== null
}
