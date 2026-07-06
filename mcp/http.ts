import type { McpConfig } from './config'

export class NsbApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * Thin REST client over the app's `/api/v1/*` endpoints.
 * All business logic stays on the backend — the MCP server only translates tool calls into HTTP.
 */
export class NsbApiClient {
  private readonly config: McpConfig

  constructor(config: McpConfig) {
    this.config = config
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return {
      Authorization: `Bearer ${this.config.token}`,
      Accept: 'application/json',
      ...extra,
    }
  }

  private async parse<T>(response: Response): Promise<T> {
    const text = await response.text()

    let data: unknown = null

    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { message: text }
    }

    if (!response.ok) {
      const message = (data as { message?: string } | null)?.message || `HTTP ${response.status}`

      throw new NsbApiError(response.status, message)
    }

    return data as T
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    const url = new URL(`${this.config.baseUrl}${path}`)

    for (const [key, value] of Object.entries(params ?? {})) {
      if (value !== undefined && value !== null && String(value).length) {
        url.searchParams.set(key, String(value))
      }
    }

    const response = await fetch(url, { headers: this.headers() })

    return this.parse<T>(response)
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    return this.parse<T>(response)
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers({ 'Content-Type': 'application/json' }),
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    return this.parse<T>(response)
  }

  async postFormData<T>(path: string, form: FormData): Promise<T> {
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: form,
    })

    return this.parse<T>(response)
  }
}
