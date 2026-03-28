import type { ArticleAuditResult, ArticleAuditSection } from './model'

function parseStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) {
    return []
  }

  return v.filter((x): x is string => typeof x === 'string')
}

function parseSection(input: unknown): ArticleAuditSection {
  if (!input || typeof input !== 'object') {
    return {
      summary: '',
      strengths: [],
      issues: [],
      recommendations: [],
    }
  }

  const o = input as Record<string, unknown>
  const scoreRaw = o.score

  let score: number | undefined

  if (typeof scoreRaw === 'number' && Number.isFinite(scoreRaw)) {
    score = Math.min(100, Math.max(0, Math.round(scoreRaw)))
  }

  return {
    score,
    summary: typeof o.summary === 'string' ? o.summary : '',
    strengths: parseStringArray(o.strengths),
    issues: parseStringArray(o.issues),
    recommendations: parseStringArray(o.recommendations),
  }
}

/**
 * Parse and normalize LLM JSON output for article audit (server-side).
 */
export function parseArticleAuditJson(raw: string): ArticleAuditResult | null {
  try {
    const parsed = JSON.parse(raw) as unknown

    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    const o = parsed as Record<string, unknown>

    return {
      preview: parseSection(o.preview),
      content: parseSection(o.content),
      seo: parseSection(o.seo),
      overall: typeof o.overall === 'string' ? o.overall : undefined,
    }
  } catch {
    return null
  }
}
