export async function postForm<T>(
  url: string,
  body: Record<string, string>,
  headers?: Record<string, string>,
  basicAuth?: { username: string; password: string },
): Promise<T> {
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Accept: 'application/json',
    ...headers,
  }

  if (basicAuth) {
    const token = Buffer.from(`${basicAuth.username}:${basicAuth.password}`).toString('base64')
    requestHeaders.Authorization = `Basic ${token}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: requestHeaders,
    body: new URLSearchParams(body).toString(),
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed (${response.status}): ${text.slice(0, 200)}`)
  }

  return JSON.parse(text) as T
}

export async function getJson<T>(url: string, headers: Record<string, string>): Promise<T> {
  const response = await fetch(url, { headers, cache: 'no-store' })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`OAuth profile request failed (${response.status}): ${text.slice(0, 200)}`)
  }

  return JSON.parse(text) as T
}
