import { en } from './messages/en'

function getByPath(obj: unknown, path: string): unknown {
  let cur: any = obj

  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = cur[part]
  }

  return cur
}

function flattenStringLeafPaths(obj: unknown, prefix = ''): string[] {
  if (!obj || typeof obj !== 'object') {
    return []
  }

  const out: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'string') {
      out.push(full)
      continue
    }

    out.push(...flattenStringLeafPaths(value, full))
  }

  return out
}

const EN_MESSAGE_KEYS = flattenStringLeafPaths(en).sort()

export function getEnMessageKeys(): readonly string[] {
  return EN_MESSAGE_KEYS
}

export function isKnownMessageKey(key: string): boolean {
  return EN_MESSAGE_KEYS.includes(key)
}

export function getEnMessageValueByKey(key: string): string | null {
  const v = getByPath(en, key)

  return typeof v === 'string' ? v : null
}

export function getMessageValueByKey(messages: unknown, key: string): string | null {
  const v = getByPath(messages, key)

  return typeof v === 'string' ? v : null
}
