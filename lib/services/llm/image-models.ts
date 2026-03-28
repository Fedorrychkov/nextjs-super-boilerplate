import { LLM_CONFIG } from '@config/env'

const DEFAULT_IMAGE_MODELS = ['gpt-image-1-mini', 'gpt-image-1.5'] as const

/** Aspect ratios supported for GPT Image via Image API (`size`). Default 16:9 → landscape. */
export type ImageAspectRatioId = '16:9' | '1:1' | '9:16'

export type ImageAspectRatioOption = {
  id: ImageAspectRatioId
  label: string
  size: '1536x1024' | '1024x1024' | '1024x1536'
}

export const GPT_IMAGE_ASPECT_RATIOS: ImageAspectRatioOption[] = [
  { id: '16:9', label: '16:9', size: '1536x1024' },
  { id: '1:1', label: '1:1', size: '1024x1024' },
  { id: '9:16', label: '9:16', size: '1024x1536' },
]

export function getImageModelAllowlist(): string[] {
  const raw = LLM_CONFIG.imageModelsCsv?.trim()

  if (!raw) {
    return [...DEFAULT_IMAGE_MODELS]
  }

  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  return parsed.length > 0 ? parsed : [...DEFAULT_IMAGE_MODELS]
}

export function resolveImageModel(requested: string | undefined, allowlist: string[]): string {
  const fallback = allowlist[0] ?? 'gpt-image-1-mini'

  if (!requested) {
    return fallback
  }

  return allowlist.includes(requested) ? requested : fallback
}

export function resolveAspectRatioOption(aspectId: string | undefined): ImageAspectRatioOption {
  const fallback = GPT_IMAGE_ASPECT_RATIOS[0]

  if (!aspectId) {
    return fallback
  }

  return GPT_IMAGE_ASPECT_RATIOS.find((a) => a.id === aspectId) ?? fallback
}

export type LlmImageModelApiPayload = {
  id: string
  label: string
  defaultAspectRatioId: ImageAspectRatioId
  aspectRatios: Array<{ id: ImageAspectRatioId; label: string; size: string }>
}

export function buildImageModelsPayloadForClient(): LlmImageModelApiPayload[] {
  const ids = getImageModelAllowlist()
  const aspectRatios = GPT_IMAGE_ASPECT_RATIOS.map((a) => ({ id: a.id, label: a.label, size: a.size }))

  return ids.map((id) => ({
    id,
    label: id,
    defaultAspectRatioId: '16:9',
    aspectRatios,
  }))
}
