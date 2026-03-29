/**
 * Parses `data: {json}\n\n` chunks from LLM SSE routes (`chat/stream`, `image/prompt/stream`, …).
 */
export async function parseLlmSseStream<T = unknown>(res: Response, onEvent: (ev: T) => void): Promise<void> {
  const reader = res.body?.getReader()

  if (!reader) {
    throw new Error('No response body')
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split('\n\n')
    buffer = blocks.pop() ?? ''

    for (const block of blocks) {
      const line = block.trim()

      if (!line.startsWith('data:')) {
        continue
      }

      const json = line.slice(5).trim()

      try {
        onEvent(JSON.parse(json) as T)
      } catch {
        // ignore malformed chunk
      }
    }
  }
}
