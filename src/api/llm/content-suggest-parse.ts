import type { ContentSuggestResult } from './model'

function stripJsonFence(raw: string): string {
  let s = raw.trim()

  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
  }

  return s.trim()
}

function parseNullableString(v: unknown): string | null {
  if (v === null || v === undefined) {
    return null
  }

  if (typeof v !== 'string') {
    return null
  }

  const t = v.trim()

  return t.length ? t : null
}

/**
 * Parse and normalize LLM JSON output for full-body Markdown suggestion (server-side).
 */
export function parseContentSuggestJson(raw: string): ContentSuggestResult | null {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as unknown

    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const o = parsed as Record<string, unknown>
    const markdown = parseNullableString(o.markdown)

    if (!markdown) {
      return null
    }

    return {
      markdown,
      rationale: parseNullableString(o.rationale),
    }
  } catch {
    return null
  }
}
