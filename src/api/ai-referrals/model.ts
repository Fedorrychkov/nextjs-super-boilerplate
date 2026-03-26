export const AI_REFERRAL_SOURCES = ['chatgpt', 'perplexity', 'copilot', 'gemini', 'claude', 'other'] as const

export type AiReferralSource = (typeof AI_REFERRAL_SOURCES)[number]

export type AiReferralVisitModel = {
  id: string
  source: AiReferralSource
  pathname: string
  referrer: string
  referrerHost: string
  userAgent?: string | null
  createdAt?: string | null
}
