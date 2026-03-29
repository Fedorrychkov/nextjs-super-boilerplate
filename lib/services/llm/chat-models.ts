import { LLM_CONFIG } from '@config/env'

const DEFAULT_CHAT_MODELS = ['gpt-4o-mini', 'gpt-4o'] as const

/**
 * Allowlist of OpenAI chat models for article assistant. Override via `LLM_CHAT_MODELS` (comma-separated).
 */
export function getChatModelAllowlist(): string[] {
  const raw = LLM_CONFIG.chatModelsCsv?.trim()

  if (!raw) {
    return [...DEFAULT_CHAT_MODELS]
  }

  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return parsed.length > 0 ? parsed : [...DEFAULT_CHAT_MODELS]
}

export function resolveChatModel(requested: string | undefined, allowlist: string[]): string {
  const fallback = allowlist[0] ?? 'gpt-4o-mini'

  if (!requested) {
    return fallback
  }

  return allowlist.includes(requested) ? requested : fallback
}
