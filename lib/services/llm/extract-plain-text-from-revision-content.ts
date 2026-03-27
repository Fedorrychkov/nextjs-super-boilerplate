import { jsonParseSafety } from '~/utils/jsonSafe'

const MAX_CHARS = 48_000

type JSONContent = {
  type?: string
  text?: string
  content?: JSONContent[]
}

function collectText(node: unknown, out: string[], depth: number): void {
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

  if (typeof n.text === 'string') {
    out.push(n.text)
  }

  if (Array.isArray(n.content)) {
    for (const child of n.content) {
      collectText(child, out, depth + 1)
    }
  }
}

/**
 * Turn stored revision `content` (TipTap JSON string, or fallback plain/Markdown string) into plain text for LLM context.
 */
export function extractPlainTextFromRevisionContent(content: string | null | undefined): string {
  if (content == null || content === '') {
    return ''
  }

  const trimmed = content.trim()
  const parsed = jsonParseSafety<unknown>(trimmed)

  if (parsed && typeof parsed === 'object') {
    const out: string[] = []
    collectText(parsed, out, 0)
    const joined = out.join(' ').replace(/\s+/g, ' ').trim()

    return joined.length > MAX_CHARS ? `${joined.slice(0, MAX_CHARS)}\n…` : joined
  }

  const asText = trimmed.replace(/\s+/g, ' ').trim()

  return asText.length > MAX_CHARS ? `${asText.slice(0, MAX_CHARS)}\n…` : asText
}
