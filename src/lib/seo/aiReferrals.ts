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

export const trackAiReferralVisit = async (params: { pathname: string; referrer: string | null; userAgent?: string | null }): Promise<void> => {
  const referrer = params.referrer?.trim()

  if (!referrer) {
    return
  }

  const source = detectAiReferralSource(referrer)

  if (!source) {
    return
  }

  const referrerUrl = new URL(referrer)

  await connectDB()

  await AiReferralVisit.create({
    source,
    pathname: params.pathname,
    referrer,
    referrerHost: referrerUrl.host.toLowerCase(),
    userAgent: params.userAgent?.trim() || null,
  })
}
