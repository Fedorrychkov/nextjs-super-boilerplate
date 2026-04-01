import connectDB from '@lib/db/client'
import AiReferralVisit from '@lib/db/models/AiReferralVisit'

import type { AiReferralSource } from '~/api/ai-referrals/model'

const AI_REFERRAL_HOST_RULES: Array<{ source: AiReferralSource; hostIncludes: string[] }> = [
  { source: 'perplexity', hostIncludes: ['perplexity.ai'] },
  { source: 'chatgpt', hostIncludes: ['chatgpt.com', 'chat.openai.com'] },
  { source: 'copilot', hostIncludes: ['copilot.microsoft.com', 'bing.com'] },
  { source: 'gemini', hostIncludes: ['gemini.google.com'] },
  { source: 'claude', hostIncludes: ['claude.ai'] },
]

export const detectAiReferralSource = (referrer: string): AiReferralSource | null => {
  let host: string

  try {
    host = new URL(referrer).host.toLowerCase()
  } catch {
    return null
  }

  const matchedRule = AI_REFERRAL_HOST_RULES.find((rule) => rule.hostIncludes.some((entry) => host.includes(entry)))

  return matchedRule?.source ?? null
}

/** Extract `utm_source` from a full URL or return null. */
export function extractUtmSourceFromPageUrl(pageUrl: string | null | undefined): string | null {
  if (!pageUrl?.trim()) {
    return null
  }

  try {
    const u = new URL(pageUrl)

    return u.searchParams.get('utm_source')?.trim() || null
  } catch {
    return null
  }
}

/**
 * Map marketing `utm_source` values (ChatGPT, Perplexity UTM experiments, etc.) to dashboard buckets.
 * Returns null if the value does not look AI-related — we do not record generic campaigns.
 */
export function detectAiReferralSourceFromUtm(utmSource: string | null | undefined): AiReferralSource | null {
  if (!utmSource?.trim()) {
    return null
  }

  const s = utmSource.trim().toLowerCase()

  if (s.includes('chatgpt') || s.includes('chatgpt.com')) {
    return 'chatgpt'
  }

  if (s.includes('openai') || s === 'gpt' || /^gpt[-_]/i.test(s)) {
    return 'chatgpt'
  }

  if (s.includes('perplexity')) {
    return 'perplexity'
  }

  if (s.includes('copilot') || s.includes('bing')) {
    return 'copilot'
  }

  if (s.includes('gemini') || s === 'bard' || s.includes('google_ai')) {
    return 'gemini'
  }

  if (s.includes('claude') || s.includes('anthropic')) {
    return 'claude'
  }

  return null
}

export type TrackAiReferralVisitParams = {
  pathname: string
  referrer: string | null
  userAgent?: string | null
  /** Full URL of the page (includes query); used to read `utm_source`. */
  pageUrl?: string | null
}

/**
 * Prefer UTM when it maps to an AI source; otherwise use HTTP Referer.
 * Persists `referrer` as the full `pageUrl` when attribution is UTM, else the real Referer URL.
 */
export const trackAiReferralVisit = async (params: TrackAiReferralVisitParams): Promise<void> => {
  const utmRaw = extractUtmSourceFromPageUrl(params.pageUrl ?? undefined)
  const sourceFromUtm = detectAiReferralSourceFromUtm(utmRaw)
  const referrerTrimmed = params.referrer?.trim() || null
  const sourceFromReferrer = referrerTrimmed ? detectAiReferralSource(referrerTrimmed) : null

  const source: AiReferralSource | null = sourceFromUtm ?? sourceFromReferrer

  if (!source) {
    return
  }

  const attributedViaUtm = Boolean(sourceFromUtm)

  let referrerStored: string
  let referrerHostStored: string

  if (attributedViaUtm) {
    const page = params.pageUrl?.trim() || `${params.pathname}${utmRaw ? `?utm_source=${encodeURIComponent(utmRaw)}` : ''}`
    referrerStored = page.slice(0, 2048)
    referrerHostStored = 'utm'
  } else {
    const referrerUrl = new URL(referrerTrimmed!)
    referrerStored = referrerTrimmed!.slice(0, 2048)
    referrerHostStored = referrerUrl.host.toLowerCase()
  }

  await connectDB()

  await AiReferralVisit.create({
    source,
    pathname: params.pathname,
    referrer: referrerStored,
    referrerHost: referrerHostStored,
    userAgent: params.userAgent?.trim() || null,
  })
}
