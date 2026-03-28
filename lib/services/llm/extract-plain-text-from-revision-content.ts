import { jsonParseSafety } from '~/utils/jsonSafe'

const MAX_CHARS = 48_000

/** TipTap node names for embedded media — omit whole subtrees for metadata-only LLM prompts (audit / SEO / preview suggest). */
const MEDIA_SUBTREE_SKIP_TYPES = new Set(['image', 'articleVideo', 'video', 'audio'])

type JSONContent = {
  type?: string
  text?: string
  content?: JSONContent[]
}

export type ExtractPlainTextOptions = {
  /** Skip image / video / audio blocks so URLs and captions inside those nodes are not sent to the model. */
  excludeMediaSubtrees?: boolean
}

function collectText(node: unknown, out: string[], depth: number, opts: ExtractPlainTextOptions): void {
  if (depth > 400 || node == null) {
    return
  }

  if (typeof node === 'string') {
    out.push(node)

    return
  }

  if (typeof node !== 'object') {
    return
  }

  const n = node as JSONContent

  if (opts.excludeMediaSubtrees && typeof n.type === 'string' && MEDIA_SUBTREE_SKIP_TYPES.has(n.type)) {
    return
  }

  if (typeof n.text === 'string') {
    out.push(n.text)
  }

  if (Array.isArray(n.content)) {
    for (const child of n.content) {
      collectText(child, out, depth + 1, opts)
    }
  }
}

/** Remove common media/CDN URL tokens left in paragraph text after subtree skips. */
function stripMediaLikeUrls(s: string): string {
  return s
    .replace(/\bhttps?:\/\/\S+\.(?:mp4|webm|mov|m4v|avi|mkv|mp3|wav|m4a|aac|ogg|flac|opus)(\?\S*)?\b/gi, ' ')
    .replace(/\/?cdn\/[a-f\d]{24}\b\S*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Turn stored revision `content` (TipTap JSON string, or fallback plain/Markdown string) into plain text for LLM context.
 */
export function extractPlainTextFromRevisionContent(content: string | null | undefined, options?: ExtractPlainTextOptions): string {
  if (content == null || content === '') {
    return ''
  }

  const trimmed = content.trim()
  const parsed = jsonParseSafety<unknown>(trimmed)
  const opts: ExtractPlainTextOptions = options ?? {}

  if (parsed && typeof parsed === 'object') {
    const out: string[] = []
    collectText(parsed, out, 0, opts)
    let joined = out.join(' ').replace(/\s+/g, ' ').trim()

    if (opts.excludeMediaSubtrees) {
      joined = stripMediaLikeUrls(joined)
    }

    return joined.length > MAX_CHARS ? `${joined.slice(0, MAX_CHARS)}\n…` : joined
  }

  let asText = trimmed.replace(/\s+/g, ' ').trim()

  if (opts.excludeMediaSubtrees) {
    asText = stripMediaLikeUrls(asText)
  }

  return asText.length > MAX_CHARS ? `${asText.slice(0, MAX_CHARS)}\n…` : asText
}
