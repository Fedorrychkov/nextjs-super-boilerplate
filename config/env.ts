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
  /** Shared secret guarding the public SEO indexing endpoints (/api/v1/seo/*). Used only when SEO_NOTIFY_AUTH_ENABLED=true. */
  SEO_NOTIFY_SECRET = process.env.SEO_NOTIFY_SECRET || '',
  /** Hard on/off for SEO endpoint auth. false (default) → endpoints open as before (gradual rollout); true → require secret header. */
  SEO_NOTIFY_AUTH_ENABLED = process.env.SEO_NOTIFY_AUTH_ENABLED === 'true',
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
  PROXY_ACCESSES = process.env.PROXY_ACCESSES || '',
  /** HMAC pepper for sign-up email codes (fallback: JWT_SECRET). */
  REGISTRATION_CODE_PEPPER = process.env.REGISTRATION_CODE_PEPPER || '',
  /** `console` — log only; `elastic` — Elastic Email API (templates + body). */
  EMAIL_SEND_MODE = process.env.EMAIL_SEND_MODE || 'empty',
  EMAIL_API_KEY = process.env.EMAIL_API_KEY || '',
  /** Sender for Elastic (must match a verified domain), e.g. `Noreply <noreply@yourdomain.com>`. */
  EMAIL_FROM = process.env.EMAIL_FROM || 'Noreply <noreply@localhost>',
  /** Elastic template names for sign-up code (`{code}` merge field). Defaults match dashboard names. */
  EMAIL_TEMPLATE_VERIFY_EMAIL_EN = process.env.EMAIL_TEMPLATE_VERIFY_EMAIL_EN,
  EMAIL_TEMPLATE_VERIFY_EMAIL_RU = process.env.EMAIL_TEMPLATE_VERIFY_EMAIL_RU,
  /** Optional Elastic templates for password codes (`{code}` merge field). Empty → plain text from i18n. */
  EMAIL_TEMPLATE_PASSWORD_CHANGE_EN = process.env.EMAIL_TEMPLATE_PASSWORD_CHANGE_EN,
  EMAIL_TEMPLATE_PASSWORD_CHANGE_RU = process.env.EMAIL_TEMPLATE_PASSWORD_CHANGE_RU,
  EMAIL_TEMPLATE_PASSWORD_FORGOT_EN = process.env.EMAIL_TEMPLATE_PASSWORD_FORGOT_EN,
  EMAIL_TEMPLATE_PASSWORD_FORGOT_RU = process.env.EMAIL_TEMPLATE_PASSWORD_FORGOT_RU,
  EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || '',
  REGISTRATION_MODE = process.env.REGISTRATION_MODE || '',

  /** SSR fallback when OS theme is unknown (`system` or no cookie). Default: `dark`. */
  DEFAULT_THEME_MODE = process.env.DEFAULT_THEME_MODE || 'dark',
  NEXT_PUBLIC_DEFAULT_THEME_MODE = process.env.NEXT_PUBLIC_DEFAULT_THEME_MODE || process.env.DEFAULT_THEME_MODE || 'dark',

  /**
   * Platform notifications (1/true/on = enabled; 0/false/off = disabled)
   * Channels: `all`, or comma-separated `web_push`, `email`
   * NOTIFY_ARTICLE_ENABLED=1
   * NOTIFY_ARTICLE_CHANNELS=all
   * NOTIFY_MFA_ENABLED=1
   * NOTIFY_MFA_CHANNELS=all
   * NOTIFY_LOGIN_ENABLED=1
   * NOTIFY_LOGIN_CHANNELS=email
   * NOTIFY_PASSWORD_ENABLED=1
   * NOTIFY_PASSWORD_CHANNELS=email
   */
  NOTIFY_ARTICLE_ENABLED = process.env.NOTIFY_ARTICLE_ENABLED || '0',
  NOTIFY_ARTICLE_CHANNELS = process.env.NOTIFY_ARTICLE_CHANNELS || 'all',
  NOTIFY_MFA_ENABLED = process.env.NOTIFY_MFA_ENABLED || '0',
  NOTIFY_MFA_CHANNELS = process.env.NOTIFY_MFA_CHANNELS || 'all',
  NOTIFY_LOGIN_ENABLED = process.env.NOTIFY_LOGIN_ENABLED || '0',
  NOTIFY_LOGIN_CHANNELS = process.env.NOTIFY_LOGIN_CHANNELS || 'email',
  NOTIFY_PASSWORD_ENABLED = process.env.NOTIFY_PASSWORD_ENABLED || '0',
  NOTIFY_PASSWORD_CHANNELS = process.env.NOTIFY_PASSWORD_CHANNELS || 'email',

  /** Account security features (0=off, 1=on unless noted) */
  AUTH_PASSWORD_CHANGE_ENABLED = process.env.AUTH_PASSWORD_CHANGE_ENABLED || '0',
  AUTH_PASSWORD_FORGOT_ENABLED = process.env.AUTH_PASSWORD_FORGOT_ENABLED || '0',
  AUTH_RECOVERY_STRICTNESS = process.env.AUTH_RECOVERY_STRICTNESS || 'strict',
  AUTH_ADMIN_ACCOUNT_RECOVERY_ENABLED = process.env.AUTH_ADMIN_ACCOUNT_RECOVERY_ENABLED || '0',
  AUTH_SESSIONS_ENABLED = process.env.AUTH_SESSIONS_ENABLED || '0',
  ONBOARDING_ENABLED = process.env.ONBOARDING_ENABLED || '0',
  ONBOARDING_PUSH_PROMPT_ENABLED = process.env.ONBOARDING_PUSH_PROMPT_ENABLED || '0',
  NEXT_PUBLIC_ONBOARDING_ENABLED = process.env.NEXT_PUBLIC_ONBOARDING_ENABLED || '0',
  NEXT_PUBLIC_ONBOARDING_PUSH_PROMPT_ENABLED = process.env.NEXT_PUBLIC_ONBOARDING_PUSH_PROMPT_ENABLED || '0',
  NEXT_PUBLIC_PUSH_IOS_PWA_HINT_ENABLED = process.env.NEXT_PUBLIC_PUSH_IOS_PWA_HINT_ENABLED || '0',
  ONBOARDING_VERSION = process.env.ONBOARDING_VERSION || '0',
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
  /** JSON array of `host:port:user:pass` (optional `:geo`); OpenAI traffic uses `getOpenAiFetch` — random proxy per request if length > 1. */
  proxyAccessesJson: PROXY_ACCESSES.trim(),
}

const REGISTRATION_CONFIG = {
  mode: REGISTRATION_MODE,
  /** Pepper for OTP HMAC; defaults to JWT secret when unset. */
  codePepper: REGISTRATION_CODE_PEPPER || JWT_SECRET,
  emailSendMode: EMAIL_SEND_MODE,
}

const EMAIL_CONFIG = {
  sendMode: EMAIL_SEND_MODE,
  emailApiKey: EMAIL_API_KEY,
  from: EMAIL_FROM,
  replyTo: EMAIL_REPLY_TO.trim(),
  templateVerifyEmailEn: EMAIL_TEMPLATE_VERIFY_EMAIL_EN,
  templateVerifyEmailRu: EMAIL_TEMPLATE_VERIFY_EMAIL_RU,
  templatePasswordChangeEn: EMAIL_TEMPLATE_PASSWORD_CHANGE_EN,
  templatePasswordChangeRu: EMAIL_TEMPLATE_PASSWORD_CHANGE_RU,
  templatePasswordForgotEn: EMAIL_TEMPLATE_PASSWORD_FORGOT_EN,
  templatePasswordForgotRu: EMAIL_TEMPLATE_PASSWORD_FORGOT_RU,
}

const NOTIFICATION_CONFIG = {
  articleEnabled: NOTIFY_ARTICLE_ENABLED,
  articleChannels: NOTIFY_ARTICLE_CHANNELS,
  mfaEnabled: NOTIFY_MFA_ENABLED,
  mfaChannels: NOTIFY_MFA_CHANNELS,
  loginEnabled: NOTIFY_LOGIN_ENABLED,
  loginChannels: NOTIFY_LOGIN_CHANNELS,
  passwordEnabled: NOTIFY_PASSWORD_ENABLED,
  passwordChannels: NOTIFY_PASSWORD_CHANNELS,
}

const THEME_CONFIG = {
  defaultMode: DEFAULT_THEME_MODE,
  publicDefaultMode: NEXT_PUBLIC_DEFAULT_THEME_MODE,
}

const ACCOUNT_CONFIG = {
  passwordChangeEnabled: parseBoolEnv(AUTH_PASSWORD_CHANGE_ENABLED, false),
  passwordForgotEnabled: parseBoolEnv(AUTH_PASSWORD_FORGOT_ENABLED, false),
  recoveryStrictness: AUTH_RECOVERY_STRICTNESS === 'flexible' ? 'flexible' : 'strict',
  adminAccountRecoveryEnabled: parseBoolEnv(AUTH_ADMIN_ACCOUNT_RECOVERY_ENABLED, false),
  sessionsEnabled: parseBoolEnv(AUTH_SESSIONS_ENABLED, false),
  onboardingEnabled: parseBoolEnv(ONBOARDING_ENABLED, false),
  onboardingPushPromptEnabled: parseBoolEnv(ONBOARDING_PUSH_PROMPT_ENABLED, false),
  publicOnboardingEnabled: parseBoolEnv(NEXT_PUBLIC_ONBOARDING_ENABLED, false),
  publicOnboardingPushPromptEnabled: parseBoolEnv(NEXT_PUBLIC_ONBOARDING_PUSH_PROMPT_ENABLED, false),
  publicPushIosPwaHintEnabled: parseBoolEnv(NEXT_PUBLIC_PUSH_IOS_PWA_HINT_ENABLED, false),
  onboardingVersion: parseNumberEnv(ONBOARDING_VERSION, 0),
}

function parseBoolEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === '') {
    return defaultValue
  }

  const normalized = value.trim().toLowerCase()

  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') {
    return false
  }

  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function parseNumberEnv(value: string | undefined, defaultValue: number): number {
  if (value == null || value.trim() === '') {
    return defaultValue
  }

  return Number(value.trim())
}

export {
  ACCOUNT_CONFIG,
  APP_ENV,
  APP_INTERNAL_ORIGIN,
  CDN_CONFIG,
  COMMIT_HASH,
  EMAIL_CONFIG,
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
  NOTIFICATION_CONFIG,
  PROXY_ACCESSES,
  PUSH_CONFIG,
  RATE_LIMIT_CONFIG,
  REDIS_URL,
  REGISTRATION_CONFIG,
  RUM_CONFIG,
  SEO_NOTIFY_AUTH_ENABLED,
  SEO_NOTIFY_SECRET,
  THEME_CONFIG,
}
