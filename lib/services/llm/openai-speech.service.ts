import { LLM_CONFIG } from '@config/env'

import { getOpenAiFetch } from './openai-fetch-proxy'

/** OpenAI TTS input limit for `tts-1` / `tts-1-hd` (characters). */
export const OPENAI_TTS_MAX_INPUT_CHARS = 4000

const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech'

export const OPENAI_TTS_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const

export type OpenAiTtsVoice = (typeof OPENAI_TTS_VOICES)[number]

export function resolveOpenAiTtsVoice(raw: string | undefined): OpenAiTtsVoice {
  if (raw && (OPENAI_TTS_VOICES as readonly string[]).includes(raw)) {
    return raw as OpenAiTtsVoice
  }

  return 'alloy'
}

/**
 * Synthesize speech via OpenAI Audio API; returns MP3 bytes.
 */
export async function synthesizeOpenAiSpeechMp3(params: { text: string; voice?: OpenAiTtsVoice }): Promise<Buffer> {
  if (!LLM_CONFIG.apiKey?.trim()) {
    throw new Error('LLM_API_KEY is not configured (required for OpenAI TTS)')
  }

  const input = params.text.slice(0, OPENAI_TTS_MAX_INPUT_CHARS)

  if (!input.trim()) {
    throw new Error('TTS input is empty')
  }

  const response = await getOpenAiFetch(LLM_CONFIG)(OPENAI_SPEECH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LLM_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: params.voice ?? 'alloy',
      input,
      format: 'mp3',
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText)

    throw new Error(`OpenAI TTS failed (${response.status}): ${errText.slice(0, 500)}`)
  }

  return Buffer.from(await response.arrayBuffer())
}
