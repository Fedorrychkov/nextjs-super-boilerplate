import { fetch as undiciFetch, ProxyAgent } from 'undici'

export type LLMConfigWithProxy = {
  /** JSON string: array of `host:port:user:pass` or `host:port:user:pass:geo` (see `parseProxyAccessLineToHttpUrl`). */
  proxyAccessesJson?: string
}

/** Сигнатура `fetch`, ожидаемая OpenAI SDK. */
export type OpenAiCompatibleFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

/**
 * Builds `http://user:pass@host:port` from a line like `host:port:user:pass` or
 * `host:port:user:pass:country` (optional 5th segment — в URL не попадает).
 * Если в пароле есть `:`, сегментов больше пяти: последний считается geo, пароль — `parts.slice(3,-1).join(':')`.
 */
export function parseProxyAccessLineToHttpUrl(line: string): string | null {
  const trimmed = line.trim()

  if (!trimmed) {
    return null
  }

  const parts = trimmed.split(':')

  if (parts.length < 4) {
    return null
  }

  const host = parts[0]
  const port = parts[1]
  const user = parts[2]

  let pass: string

  if (parts.length === 4) {
    pass = parts[3]
  } else if (parts.length === 5) {
    pass = parts[3]
  } else {
    pass = parts.slice(3, -1).join(':')
  }

  return `http://${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${host}:${port}`
}

/**
 * Парсит `PROXY_ACCESSES` (JSON-массив строк) в список URL прокси для undici.
 */
export function parseProxyAccessesJsonToHttpUrls(raw: string | undefined): string[] {
  const s = raw?.trim()

  if (!s) {
    return []
  }

  let list: unknown

  try {
    list = JSON.parse(s) as unknown
  } catch {
    return []
  }

  if (!Array.isArray(list) || list.length === 0) {
    return []
  }

  return list
    .filter((x): x is string => typeof x === 'string')
    .map((line) => parseProxyAccessLineToHttpUrl(line))
    .filter((u): u is string => u != null)
}

function pickRandomProxyUrl(urls: string[]): string {
  return urls[Math.floor(Math.random() * urls.length)]!
}

/**
 * `fetch` из `undici` для OpenAI SDK и прямых вызовов к api.openai.com.
 * Если `proxyAccessesJson` пуст — обычный `undiciFetch`.
 * Если один прокси — один `ProxyAgent` на все запросы.
 * Если несколько — **на каждый выбор** случайный прокси из списка.
 */
export function getOpenAiFetch(config: LLMConfigWithProxy): OpenAiCompatibleFetch {
  const urls = parseProxyAccessesJsonToHttpUrls(config.proxyAccessesJson)

  if (urls.length === 0) {
    return undiciFetch as unknown as OpenAiCompatibleFetch
  }

  if (urls.length === 1) {
    const dispatcher = new ProxyAgent(urls[0])

    const one: OpenAiCompatibleFetch = (input, init) => {
      return undiciFetch(input as never, { ...(init ?? {}), dispatcher } as never) as unknown as Promise<Response>
    }

    return one
  }

  const many: OpenAiCompatibleFetch = (input, init) => {
    const proxyUrl = pickRandomProxyUrl(urls)
    const dispatcher = new ProxyAgent(proxyUrl)

    return undiciFetch(input as never, { ...(init ?? {}), dispatcher } as never) as unknown as Promise<Response>
  }

  return many
}
