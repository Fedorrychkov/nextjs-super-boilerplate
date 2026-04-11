export type ReferrerQueryParamPair = { key: string; value: string }

/**
 * parses query parameters from the full URL in `referrer` (as stored in AiReferralVisit).
 * invalid and empty strings give an empty array.
 */
export function parseReferrerQueryParams(referrer: string | null | undefined): ReferrerQueryParamPair[] {
  if (referrer == null || typeof referrer !== 'string') {
    return []
  }

  const trimmed = referrer.trim()

  if (!trimmed) {
    return []
  }

  try {
    const url = new URL(trimmed)
    const out: ReferrerQueryParamPair[] = []

    url.searchParams.forEach((value, key) => {
      out.push({ key, value })
    })

    return out
  } catch {
    return []
  }
}
