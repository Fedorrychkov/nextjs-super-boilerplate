/**
 * Checks that only make sense when a data store is a sibling container of the api (deploy inputs
 * `mongo_enabled` / `redis_enabled`, reaching the doctor as MONGO_ENABLED / REDIS_ENABLED). They
 * exist because the first stage deploy of a downstream project ran eight minutes and died on
 * `MONGO_URI=mongodb://localhost:27017/...`, and the first successful one shipped
 * `REDIS_URL=redis://localhost:6379` — inside api-service, localhost is api-service, the worker
 * restarted in a loop and sign-up answered 500. Pure so the doctor's rules can be unit-tested.
 */
export type MongoTopologyInput = {
  /** deploy flag MONGO_ENABLED: mongo runs as a compose service next to the api */
  mongoEnabled: boolean
  uri?: string
  /** MONGO_HOST, used only when uri is empty */
  host?: string
  /**
   * MONGO_USER / MONGO_PASSWORD. The compose file creates the container's root user
   * UNCONDITIONALLY (`${MONGO_USER:-admin}` / `${MONGO_PASSWORD:-password}`), so with the sibling
   * container credentials are never optional — leaving them empty means "admin/password".
   */
  user?: string
  password?: string
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1'])

/** First host of a mongodb:// or mongodb+srv:// URI (brackets stripped for IPv6); null when the string does not parse. */
export function mongoHostFromUri(uri: string): string | null {
  const match = /^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?(?:\[([^\]]+)\]|([^/?,:]+))/i.exec(uri.trim())

  return match ? match[1] || match[2] : null
}

/** Database named in the URI path (`/app`), or null. */
function mongoPathDatabase(uri: string): string | null {
  const match = /^mongodb(?:\+srv)?:\/\/[^/]*\/([^/?]+)/i.exec(uri.trim())

  return match ? match[1] : null
}

export function containerMongoFindings(input: MongoTopologyInput): string[] {
  if (!input.mongoEnabled) {
    return []
  }

  const findings: string[] = []
  const uri = input.uri?.trim() ?? ''
  const host = uri ? mongoHostFromUri(uri) : input.host || 'localhost'

  if (host && LOOPBACK.has(host.toLowerCase())) {
    findings.push(
      `Mongo host is "${host}", but MONGO_ENABLED=true runs mongo as a sibling container: ` +
        'inside api-service "localhost" is api-service itself. Use the compose service name "mongo".',
    )
  }

  if (uri) {
    const hasCredentials = /^mongodb(?:\+srv)?:\/\/[^/]*@/i.test(uri)

    if (!hasCredentials) {
      findings.push(
        'MONGO_URI carries no credentials, but the sibling mongo container is always created with a root user (MONGO_USER/MONGO_PASSWORD, default admin/password) and refuses unauthenticated clients. Either leave MONGO_URI empty and set MONGO_USER/MONGO_PASSWORD (the fields assemble it with authSource=admin) or put user:password@ into the URI.',
      )
    } else if (!/[?&]authSource=/i.test(uri) && mongoPathDatabase(uri) !== 'admin') {
      findings.push(
        'MONGO_URI has credentials but no authSource=admin: the root user lives in "admin", and without it the driver authenticates against the database in the path and is refused.',
      )
    }
  } else if (!input.user?.trim() || !input.password?.trim()) {
    findings.push(
      'MONGO_USER and MONGO_PASSWORD must both be set with MONGO_ENABLED=true: the container is created with that root user, and the assembled connection string carries exactly these values (empty ones become the defaults admin/password on the container side and a refused login on the app side).',
    )
  }

  return findings
}

export type RedisTopologyInput = {
  /** deploy flag REDIS_ENABLED: redis runs as a compose service next to the api */
  redisEnabled: boolean
  url?: string
}

/** Host of a redis:// or rediss:// URL; null when the string does not parse. */
export function redisHostFromUrl(url: string): string | null {
  const match = /^rediss?:\/\/(?:[^@/]*@)?(?:\[([^\]]+)\]|([^/?:]+))/i.exec(url.trim())

  return match ? match[1] || match[2] : null
}

export function containerRedisFindings(input: RedisTopologyInput): string[] {
  if (!input.redisEnabled) {
    return []
  }

  const url = input.url?.trim() ?? ''

  if (!url) {
    return []
  }

  const host = redisHostFromUrl(url)

  if (host && LOOPBACK.has(host.toLowerCase())) {
    return [
      `Redis host is "${host}", but REDIS_ENABLED=true runs redis as a sibling container: ` +
        'inside api-service "localhost" is api-service itself. Use redis://redis:6379 (the compose service name).',
    ]
  }

  return []
}
