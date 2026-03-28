import type { SeoSuggestResult } from './model'

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
 * Parse and normalize LLM JSON output for SEO field suggestions (server-side).
 */
export function parseSeoSuggestJson(raw: string): SeoSuggestResult | null {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as unknown

    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const o = parsed as Record<string, unknown>

    const result: SeoSuggestResult = {
      metaTitle: parseNullableString(o.metaTitle),
      metaDescription: parseNullableString(o.metaDescription),
      ogTitle: parseNullableString(o.ogTitle),
      ogDescription: parseNullableString(o.ogDescription),
      keywords: parseNullableString(o.keywords),
    }

    const hasAny =
      result.metaTitle != null || result.metaDescription != null || result.ogTitle != null || result.ogDescription != null || result.keywords != null

    return hasAny ? result : null
  } catch {
    return null
  }
}
