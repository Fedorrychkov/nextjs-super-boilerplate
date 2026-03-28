import type { PreviewSuggestResult } from './model'

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
 * Parse and normalize LLM JSON output for preview (title/description) suggestions (server-side).
 */
export function parsePreviewSuggestJson(raw: string): PreviewSuggestResult | null {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as unknown

    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const o = parsed as Record<string, unknown>

    const result: PreviewSuggestResult = {
      title: parseNullableString(o.title),
      description: parseNullableString(o.description),
      rationale: parseNullableString(o.rationale),
    }

    const hasAny = result.title != null || result.description != null

    return hasAny ? result : null
  } catch {
    return null
  }
}
