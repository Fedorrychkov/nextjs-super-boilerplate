export type PushProvider = 'apple' | 'fcm' | 'mozilla' | 'unknown'

export function detectPushProvider(endpoint: string): PushProvider {
  try {
    const host = new URL(endpoint).host.toLowerCase()

    if (host.includes('apple')) {
      return 'apple'
    }

    if (host.includes('google') || host.includes('fcm')) {
      return 'fcm'
    }

    if (host.includes('mozilla')) {
      return 'mozilla'
    }
  } catch {
    // invalid URL
  }

  return 'unknown'
}

type PushSubscriptionDoc = {
  _id: { toString(): string }
  userId: string
  endpoint: string
  userAgent?: string | null
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
}

const toIso = (value?: Date | string | null) => {
  if (!value) {
    return null
  }

  return value instanceof Date ? value.toISOString() : String(value)
}

/** Full payload for admin tooling only. */
export function mapPushSubscriptionDoc(doc: PushSubscriptionDoc) {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    endpoint: doc.endpoint,
    userAgent: doc.userAgent ?? null,
    provider: detectPushProvider(doc.endpoint),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
  }
}

/** Safe payload for the authenticated user — no endpoint, user-agent, or user id. */
export function mapPushSubscriptionDocPublic(doc: PushSubscriptionDoc, currentEndpoint?: string | null) {
  return {
    id: doc._id.toString(),
    provider: detectPushProvider(doc.endpoint),
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    isCurrent: Boolean(currentEndpoint && doc.endpoint === currentEndpoint),
  }
}
