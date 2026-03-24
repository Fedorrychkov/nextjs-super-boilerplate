import DOMPurify from 'isomorphic-dompurify'

import { DEFAULT_LINK_URI_CTX, isAllowedHref } from '~/components/Blocks/Editor/link/linkPolicy'

type SanitizeAttributeHookData = {
  attrName: string
  attrValue: string
  keepAttr: boolean
}

/** Tags aligned with default Tiptap extensions (StarterKit subset + lists, table, image, tasks, highlight). */
const ARTICLE_HTML_ALLOWED_TAGS = [
  'p',
  'h1',
  'h2',
  'h3',
  'blockquote',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'strike',
  'del',
  'ins',
  'sub',
  'sup',
  'a',
  'code',
  'pre',
  'span',
  'mark',
  'ul',
  'ol',
  'li',
  'hr',
  'br',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'figure',
  'figcaption',
  'picture',
  'source',
  'img',
  'div',
  'label',
  'input',
] as const

const ARTICLE_HTML_ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'title',
  'src',
  'srcset',
  'sizes',
  'media',
  'alt',
  'width',
  'height',
  'class',
  'style',
  'type',
  'checked',
  'disabled',
  'start',
  'colspan',
  'rowspan',
  'scope',
  'loading',
  'decoding',
  'data-type',
  'data-checked',
  'data-asset-id',
  'data-resource-type',
  'data-color',
  'aria-disabled',
  'aria-label',
] as const

const DOMPURIFY_CONFIG = {
  ALLOWED_TAGS: [...ARTICLE_HTML_ALLOWED_TAGS],
  ALLOWED_ATTR: [...ARTICLE_HTML_ALLOWED_ATTR],
  /** Defer URL validation to uponSanitizeAttribute (href/src/srcset). */
  ALLOWED_URI_REGEXP: /./,
}

const CONTROL_CHARS = /[\u0000-\u001f\u007f<>]/u

function isSafeRelativePath(value: string): boolean {
  const t = value.trim()

  if (!t.startsWith('/') || t.startsWith('//')) {
    return false
  }

  if (CONTROL_CHARS.test(t)) {
    return false
  }

  const lowered = t.toLowerCase()

  return !lowered.includes('javascript:') && !lowered.includes('vbscript:') && !lowered.includes('data:')
}

function isLocalHashRef(value: string): boolean {
  const t = value.trim()

  if (!t.startsWith('#')) {
    return false
  }

  return !CONTROL_CHARS.test(t) && t.length <= 2048
}

export function isAllowedResourceUrl(raw: string, kind: 'href' | 'src'): boolean {
  const value = raw.trim()

  if (!value) {
    return false
  }

  const lowered = value.toLowerCase()

  if (lowered.startsWith('javascript:') || lowered.startsWith('vbscript:') || lowered.startsWith('data:')) {
    return false
  }

  if (lowered.startsWith('//')) {
    return false
  }

  if (isLocalHashRef(value)) {
    return true
  }

  if (value.startsWith('/') && kind === 'src') {
    return isSafeRelativePath(value)
  }

  if (value.startsWith('/') && kind === 'href') {
    return isSafeRelativePath(value)
  }

  return isAllowedHref(value, DEFAULT_LINK_URI_CTX)
}

function parseSrcsetUrlPart(part: string): string | null {
  const t = part.trim()

  if (!t) {
    return null
  }

  const lastSpace = t.lastIndexOf(' ')

  if (lastSpace === -1) {
    return t
  }

  const url = t.slice(0, lastSpace).trim()
  const descriptor = t.slice(lastSpace + 1).trim()

  if (/^\d+w$/.test(descriptor) || /^\d+(?:\.\d+)?x$/.test(descriptor)) {
    return url || null
  }

  return t
}

export function isAllowedSrcsetValue(raw: string): boolean {
  const chunks = raw
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)

  for (const chunk of chunks) {
    const url = parseSrcsetUrlPart(chunk)

    if (!url || !isAllowedResourceUrl(url, 'src')) {
      return false
    }
  }

  return true
}

let hooksInstalled = false

function ensureAttributeHooks(): void {
  if (hooksInstalled) {
    return
  }

  hooksInstalled = true

  DOMPurify.addHook('uponSanitizeAttribute', (_node: Element, hookEvent: SanitizeAttributeHookData) => {
    const name = hookEvent.attrName.toLowerCase()
    const value = String(hookEvent.attrValue)

    if (name === 'href') {
      if (!isAllowedResourceUrl(value, 'href')) {
        hookEvent.keepAttr = false
      }

      return
    }

    if (name === 'src') {
      if (!isAllowedResourceUrl(value, 'src')) {
        hookEvent.keepAttr = false
      }

      return
    }

    if (name === 'srcset') {
      if (!isAllowedSrcsetValue(value)) {
        hookEvent.keepAttr = false
      }

      return
    }

    if (name === 'style') {
      const lower = value.toLowerCase()

      if (lower.includes('url(') || lower.includes('expression(') || lower.includes('javascript:') || lower.includes('behavior:')) {
        hookEvent.keepAttr = false
      }
    }
  })
}

/**
 * Server-side HTML sanitizer for rendered article body (after Tiptap static render + post-processors).
 * Does not replace CSP or JSON validation; use as defense-in-depth before dangerouslySetInnerHTML.
 */
export function sanitizeArticleHtml(dirty: string): string {
  ensureAttributeHooks()

  return DOMPurify.sanitize(dirty, DOMPURIFY_CONFIG)
}
