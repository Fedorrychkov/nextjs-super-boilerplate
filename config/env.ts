const {
  APP_ENV = 'development',
  APP_INTERNAL_ORIGIN = 'http://127.0.0.1:3000', // e.g. http://127.0.0.1:3000 — used for server-side requests to own API when public hostname is not resolvable (e.g. in Docker)
  NEXT_PUBLIC_APP_ENV = 'development',
  NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change',
  JWT_ACCESS_EXPIRES_IN = Number(process.env.JWT_ACCESS_EXPIRES_IN || 3600), // 1 hour
  JWT_REFRESH_EXPIRES_IN = Number(process.env.JWT_REFRESH_EXPIRES_IN || 15724800), // 21 days
  MONGO_URI = process.env.MONGO_URI || '',
  MONGO_HOST = process.env.MONGO_HOST || 'localhost',
  MONGO_PORT = process.env.MONGO_PORT || '27017',
  MONGO_USER = process.env.MONGO_USER || '',
  MONGO_PASSWORD = process.env.MONGO_PASSWORD || '',
  MONGO_DB = process.env.MONGO_DB || 'app',
  RATE_LIMIT_POINTS = Number(process.env.RATE_LIMIT_POINTS || 400),
  REDIS_URL = process.env.REDIS_URL,
  VAPID_SUBJECT = process.env.VAPID_SUBJECT,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY,
  INDEXNOW_API_KEY = process.env.INDEXNOW_API_KEY,
  INDEXNOW_KEY_LOCATION = process.env.INDEXNOW_KEY_LOCATION,
  GOOGLE_INDEXING_CLIENT_EMAIL = process.env.GOOGLE_INDEXING_CLIENT_EMAIL,
  GOOGLE_INDEXING_PRIVATE_KEY = process.env.GOOGLE_INDEXING_PRIVATE_KEY,
  MFA_ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || '',
  FIRST_ADMIN_LOGIN = process.env.FIRST_ADMIN_LOGIN || '',
  FIRST_ADMIN_PASSWORD = process.env.FIRST_ADMIN_PASSWORD || '',
  UPLOADCARE_PUBLIC_KEY = process.env.UPLOADCARE_PUBLIC_KEY || '',
  UPLOADCARE_SECRET_KEY = process.env.UPLOADCARE_SECRET_KEY || '',
  /** Server-only deploy revision (CI injects `COMMIT_HASH` into env; not exposed to the client). */
  COMMIT_HASH = process.env.COMMIT_HASH || process.env.VERCEL_GIT_COMMIT_SHA || '',
  RUM_ENABLED = process.env.RUM_ENABLED !== 'false',
  NEXT_PUBLIC_RUM_ENABLED = process.env.NEXT_PUBLIC_RUM_ENABLED == 'false',
  NEXT_PUBLIC_ORGANIZATION_SAME_AS = process.env.NEXT_PUBLIC_ORGANIZATION_SAME_AS || '',
  LLM_API_KEY = process.env.LLM_API_KEY || '',
  NEXT_PUBLIC_LLM_ENABLED = process.env.NEXT_PUBLIC_LLM_ENABLED === 'true',
  /** Comma-separated OpenAI chat model ids (optional). Defaults in `getChatModelAllowlist`. */
  LLM_CHAT_MODELS = process.env.LLM_CHAT_MODELS || '',
  /** Comma-separated GPT Image model ids for `images.generate` (optional). Defaults in `getImageModelAllowlist`. */
  LLM_IMAGE_MODELS = process.env.LLM_IMAGE_MODELS || '',
  /** Per-user LLM chat requests per `LLM_CHAT_RATE_DURATION_SEC` window (Redis or memory). */
  LLM_CHAT_RATE_LIMIT_POINTS = Number(process.env.LLM_CHAT_RATE_LIMIT_POINTS || 30),
  LLM_CHAT_RATE_DURATION_SEC = Number(process.env.LLM_CHAT_RATE_DURATION_SEC || 60),
} = process.env

const isDevelop = [APP_ENV, NEXT_PUBLIC_APP_ENV].includes('development')
const isStage = [APP_ENV, NEXT_PUBLIC_APP_ENV].includes('stage')
const isProd = [APP_ENV, NEXT_PUBLIC_APP_ENV].includes('production')

// JWT config
const JWT_CONFIG = {
  secret: JWT_SECRET,
  accessExpiresIn: JWT_ACCESS_EXPIRES_IN,
  refreshExpiresIn: JWT_REFRESH_EXPIRES_IN,
}

// MongoDB: use MONGO_URI (e.g. for Atlas or full DSN) or build from host/port/user/password/db (e.g. local container mongo:27017)
const MONGODB_CONFIG = {
  uri: MONGO_URI || undefined,
  host: MONGO_HOST,
  port: Number(MONGO_PORT) || 27017,
  user: MONGO_USER || undefined,
  password: MONGO_PASSWORD || undefined,
  db: MONGO_DB,
}

const RATE_LIMIT_CONFIG = {
  points: Number(RATE_LIMIT_POINTS || 400),
  duration: 60,
}

const PUSH_CONFIG = {
  subject: VAPID_SUBJECT,
  publicKey: NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  privateKey: VAPID_PRIVATE_KEY,
}

const MFA_CONFIG = {
  encryptionKey: MFA_ENCRYPTION_KEY,
}

const FIRST_ADMIN_CONFIG = {
  login: FIRST_ADMIN_LOGIN,
  password: FIRST_ADMIN_PASSWORD,
}

const CDN_CONFIG = {
  publicKey: UPLOADCARE_PUBLIC_KEY,
  secretKey: UPLOADCARE_SECRET_KEY,
}

/** RUM ingest: sampling is client-side (`NEXT_PUBLIC_RUM_SAMPLE_RATE`) so all vitals from a sampled session are stored. */
const RUM_CONFIG = {
  enabled: RUM_ENABLED,
  publicEnabled: NEXT_PUBLIC_RUM_ENABLED,
}

const LLM_CONFIG = {
  apiKey: LLM_API_KEY,
  enabled: NEXT_PUBLIC_LLM_ENABLED,
  chatModelsCsv: LLM_CHAT_MODELS,
  imageModelsCsv: LLM_IMAGE_MODELS,
  chatRateLimitPoints: Number.isFinite(LLM_CHAT_RATE_LIMIT_POINTS) ? LLM_CHAT_RATE_LIMIT_POINTS : 30,
  chatRateDurationSec: Number.isFinite(LLM_CHAT_RATE_DURATION_SEC) ? LLM_CHAT_RATE_DURATION_SEC : 60,
}

export {
  APP_ENV,
  APP_INTERNAL_ORIGIN,
  CDN_CONFIG,
  COMMIT_HASH,
  FIRST_ADMIN_CONFIG,
  GOOGLE_INDEXING_CLIENT_EMAIL,
  GOOGLE_INDEXING_PRIVATE_KEY,
  INDEXNOW_API_KEY,
  INDEXNOW_KEY_LOCATION,
  isDevelop,
  isProd,
  isStage,
  JWT_CONFIG,
  LLM_CONFIG,
  MFA_CONFIG,
  MONGODB_CONFIG,
  NEXT_PUBLIC_ORGANIZATION_SAME_AS,
  NEXT_PUBLIC_SITE_URL,
  PUSH_CONFIG,
  RATE_LIMIT_CONFIG,
  REDIS_URL,
  RUM_CONFIG,
}
