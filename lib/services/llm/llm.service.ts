import { LLM_CONFIG } from '@config/env'
import OpenAI from 'openai'

import { getOpenAiFetch } from './openai-fetch-proxy'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  stream?: boolean
  /** OpenAI JSON mode — model must support it; output should be valid JSON. */
  responseFormatJson?: boolean
}

export interface ChatCompletionResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export type ChatStreamChunk =
  | { type: 'text'; text: string }
  | {
      type: 'usage'
      usage: {
        promptTokens: number
        completionTokens: number
        totalTokens: number
      }
    }

export class LLMService {
  private client: OpenAI | null = null

  /**
   * Initializing the OpenAI client
   */
  private getClient(): OpenAI | null | undefined {
    if (!this.client) {
      if (!LLM_CONFIG.apiKey && LLM_CONFIG.enabled) {
        throw new Error('LLM_API_KEY is not configured. Please set LLM_API_KEY in environment variables.')
      }

      if (LLM_CONFIG.enabled) {
        this.client = new OpenAI({
          apiKey: LLM_CONFIG.apiKey,
          fetch: getOpenAiFetch(LLM_CONFIG),
        })
      }
    }

    return this.client
  }

  /**
   * Sending message to ChatGPT
   * @param messages - Array of messages for the dialog
   * @param options - Options for the request (model, temperature, etc.)
   * @returns Response from ChatGPT
   */
  async chat(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const client = this.getClient()

    if (!client) {
      throw new Error('LLM is not enabled. Please set NEXT_PUBLIC_LLM_ENABLED to true in environment variables.')
    }

    const { model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 1000, stream = false, responseFormatJson = false } = options || {}

    try {
      const completion = await client.chat.completions.create({
        model,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature,
        max_tokens: maxTokens,
        stream,
        ...(responseFormatJson ? { response_format: { type: 'json_object' as const } } : {}),
      })

      if (stream) {
        // For streaming we need to process differently
        throw new Error('Streaming mode is not yet implemented. Please set stream: false')
      }

      const completionWithoutStream = 'choices' in completion ? completion : undefined

      const content = completionWithoutStream?.choices[0]?.message?.content || ''
      const usage = completionWithoutStream?.usage
        ? {
            promptTokens: completionWithoutStream.usage.prompt_tokens,
            completionTokens: completionWithoutStream.usage.completion_tokens,
            totalTokens: completionWithoutStream.usage.total_tokens,
          }
        : undefined

      return {
        content,
        usage,
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`OpenAI API error: ${error.message}`)
      }

      throw new Error('Unknown error occurred while calling OpenAI API')
    }
  }

  /**
   * Streaming response: text deltas and optional final usage (requires `stream_options.include_usage`).
   */
  async *chatStream(messages: ChatMessage[], options?: ChatCompletionOptions): AsyncGenerator<ChatStreamChunk> {
    const client = this.getClient()

    if (!client) {
      throw new Error('LLM is not enabled. Please set NEXT_PUBLIC_LLM_ENABLED to true in environment variables.')
    }

    const { model = 'gpt-4o-mini', temperature = 0.7, maxTokens = 4096 } = options || {}

    const stream = await client.chat.completions.create({
      model,
      messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
      stream_options: { include_usage: true },
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? ''

      if (delta) {
        yield { type: 'text', text: delta }
      }

      if (chunk.usage) {
        yield {
          type: 'usage',
          usage: {
            promptTokens: chunk.usage.prompt_tokens,
            completionTokens: chunk.usage.completion_tokens,
            totalTokens: chunk.usage.total_tokens,
          },
        }
      }
    }
  }

  /**
   * Simple request to ChatGPT (without dialog history)
   * @param prompt - Text of the request
   * @param systemPrompt - System prompt (optional)
   * @param options - Options for the request
   * @returns Response from ChatGPT
   */
  async ask(prompt: string, systemPrompt?: string, options?: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const messages: ChatMessage[] = []

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      })
    }

    messages.push({
      role: 'user',
      content: prompt,
    })

    return this.chat(messages, options)
  }

  /**
   * Generating text using ChatGPT
   * @param prompt - Prompt for generation
   * @param options - Options for the request
   * @returns Generated text
   */
  async generateText(prompt: string, options?: ChatCompletionOptions): Promise<string> {
    const response = await this.ask(prompt, undefined, options)

    return response.content
  }

  /**
   * Getting the list of available models (for debugging)
   * @returns List of models
   */
  async listModels(): Promise<string[]> {
    const client = this.getClient()

    if (!client) {
      throw new Error('LLM is not enabled. Please set NEXT_PUBLIC_LLM_ENABLED to true in environment variables.')
    }

    try {
      const models = await client.models.list()

      return models.data.map((model) => model.id)
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to list models: ${error.message}`)
      }

      throw new Error('Unknown error occurred while listing models')
    }
  }

  /**
   * Low-level stream of GPT Image `images.generate` events (partial previews + final frame).
   * @see https://developers.openai.com/api/docs/guides/image-generation
   */
  async *iterateImageGenerationStream(params: { model: string; prompt: string; size: '1024x1024' | '1536x1024' | '1024x1536' }): AsyncGenerator<
    | {
        kind: 'partial'
        b64Json: string
        outputFormat: 'png' | 'jpeg' | 'webp'
        partialImageIndex: number
      }
    | {
        kind: 'completed'
        b64Json: string
        outputFormat: 'png' | 'jpeg' | 'webp'
        usage: { promptTokens: number; completionTokens: number; totalTokens: number }
      }
  > {
    const client = this.getClient()

    if (!client) {
      throw new Error('LLM is not enabled. Please set NEXT_PUBLIC_LLM_ENABLED to true in environment variables.')
    }

    const stream = await client.images.generate({
      model: params.model,
      prompt: params.prompt,
      size: params.size,
      stream: true,
      partial_images: 3,
      quality: 'medium',
      output_format: 'png',
    })

    for await (const event of stream) {
      if (event.type === 'image_generation.partial_image') {
        yield {
          kind: 'partial',
          b64Json: event.b64_json,
          outputFormat: event.output_format,
          partialImageIndex: event.partial_image_index,
        }
      } else if (event.type === 'image_generation.completed') {
        const u = event.usage

        yield {
          kind: 'completed',
          b64Json: event.b64_json,
          outputFormat: event.output_format,
          usage: {
            promptTokens: u.input_tokens,
            completionTokens: u.output_tokens,
            totalTokens: u.total_tokens,
          },
        }
      }
    }
  }

  /**
   * GPT Image: streaming `images.generate` (partial frames + final `image_generation.completed` with usage).
   */
  async generateImageFromPromptStream(params: { model: string; prompt: string; size: '1024x1024' | '1536x1024' | '1024x1536' }): Promise<{
    b64Json: string
    outputFormat: 'png' | 'jpeg' | 'webp'
    usage: { promptTokens: number; completionTokens: number; totalTokens: number }
  }> {
    let completed:
      | {
          b64Json: string
          outputFormat: 'png' | 'jpeg' | 'webp'
          usage: { promptTokens: number; completionTokens: number; totalTokens: number }
        }
      | undefined

    for await (const ev of this.iterateImageGenerationStream(params)) {
      if (ev.kind === 'completed') {
        completed = {
          b64Json: ev.b64Json,
          outputFormat: ev.outputFormat,
          usage: ev.usage,
        }
      }
    }

    if (!completed?.b64Json) {
      throw new Error('Image generation returned no final image')
    }

    return completed
  }
}

export const llmService = new LLMService()
