import { DEFAULT_LINK_URI_CTX, isAllowedHref, normalizeUrlForLink } from '../link/linkPolicy'

/** Embedded images copied/dropped (data URL). */
export function isDataUrlSrc(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith('data:')
}

/**
 * URL for the input field: https/http or path from the root of the site (/…).
 * Does not accept data: — such images can only be inserted into the document.
 */
export function resolveExternalImageSrc(input: string): string | null {
  const t = input.trim()

  if (!t) {
    return null
  }

  if (t.startsWith('data:')) {
    return null
  }

  if (t.startsWith('/')) {
    return t
  }

  const normalized = normalizeUrlForLink(t)

  if (!normalized || !isAllowedHref(normalized, DEFAULT_LINK_URI_CTX)) {
    return null
  }

  return normalized
}
