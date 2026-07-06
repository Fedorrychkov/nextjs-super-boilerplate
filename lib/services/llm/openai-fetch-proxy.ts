import { fetch as undiciFetch, ProxyAgent } from 'undici'

export type LLMConfigWithProxy = {
  /** JSON string: array of `host:port:user:pass` or `host:port:user:pass:geo` (see `parseProxyAccessLineToHttpUrl`). */
  proxyAccessesJson?: string
}

/** `fetch` signature expected by the OpenAI SDK. */
export type OpenAiCompatibleFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

/**
 * Builds `http://user:pass@host:port` from a line like `host:port:user:pass` or
 * `host:port:user:pass:country` (optional 5th segment — not included in the URL).
 * If the password contains `:`, there are more than five segments: the last is treated as geo, the password is `parts.slice(3,-1).join(':')`.
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
 * Parses `PROXY_ACCESSES` (JSON array of strings) into a list of proxy URLs for undici.
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
 * `undici` `fetch` for the OpenAI SDK and direct calls to api.openai.com.
 * If `proxyAccessesJson` is empty — plain `undiciFetch`.
 * If there is a single proxy — one `ProxyAgent` for all requests.
 * If there are several — a random proxy from the list is picked **per call**.
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
