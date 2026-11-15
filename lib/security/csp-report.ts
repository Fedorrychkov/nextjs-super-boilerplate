/**
 * Browser reports of report-only CSP violations (config/csp.ts). Only the directive and the
 * blocked origin are kept: page and resource URLs carry ids and tokens, and the log is not the
 * place for them. Two formats: legacy `report-uri` (`{"csp-report": {...}}`) and the Reporting
 * API (`[{ type: "csp-violation", body }]`).
 */

export type CspViolation = { directive: string; blocked: string }

/** Keywords (`inline`, `eval`) as they are; a URL as scheme + host only. */
const blockedOf = (value: unknown): string => {
  if (typeof value !== 'string' || !value) return 'unknown'

  if (/^[a-z-]{1,40}$/i.test(value)) return value.toLowerCase()

  try {
    const url = new URL(value)

    return url.host ? `${url.protocol}//${url.host}` : url.protocol
  } catch {
    return 'other'
  }
}

const directiveOf = (value: unknown): string => {
  const first = typeof value === 'string' ? value.split(' ')[0] : undefined

  return first && /^[a-z-]{1,40}$/.test(first) ? first : 'unknown'
}

export function cspViolations(payload: unknown, limit = 10): CspViolation[] {
  const entries = Array.isArray(payload) ? payload : [payload]

  return entries
    .flatMap((entry): CspViolation[] => {
      if (!entry || typeof entry !== 'object') return []

      const legacy = (entry as { 'csp-report'?: Record<string, unknown> })['csp-report']

      if (legacy) {
        return [{ directive: directiveOf(legacy['effective-directive'] ?? legacy['violated-directive']), blocked: blockedOf(legacy['blocked-uri']) }]
      }

      const report = entry as { type?: unknown; body?: Record<string, unknown> }

      if (report.type === 'csp-violation' && report.body) {
        return [{ directive: directiveOf(report.body.effectiveDirective), blocked: blockedOf(report.body.blockedURL) }]
      }

      return []
    })
    .slice(0, limit)
}
