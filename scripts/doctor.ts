/**
 * Validates environment + feature-flag consistency.
 * Usage: pnpm doctor [-- env-file]
 * Default env file: .env.local
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Level = 'error' | 'warn' | 'info'

type Finding = { level: Level; code: string; message: string }

const DEFAULT_JWT_SECRET = 'your-secret-key-change'

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) {
    return
  }

  const raw = readFileSync(filePath, 'utf8')

  for (const line of raw.split('\n')) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const eq = trimmed.indexOf('=')

    if (eq <= 0) {
      continue
    }

    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()

    // eslint-disable-next-line prettier/prettier
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function parseBool(value: string | undefined): boolean {
  if (!value?.trim()) {
    return false
  }

  const normalized = value.trim().toLowerCase()

  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function push(findings: Finding[], level: Level, code: string, message: string) {
  findings.push({ level, code, message })
}

async function main() {
  const envArg = process.argv.find((arg) => arg.endsWith('.env') || arg.endsWith('.env.local') || arg.endsWith('.env.prod') || arg.endsWith('.env.stage'))
  const envFile = resolve(process.cwd(), envArg ?? '.env.local')

  if (!existsSync(envFile)) {
    console.error(`[doctor] Env file not found: ${envFile}`)
    console.error('Usage: pnpm doctor [path/to/.env.local]')
    process.exit(1)
  }

  loadEnvFile(envFile)

  const { ACCOUNT_CONFIG, EMAIL_CONFIG, JWT_CONFIG, LLM_CONFIG, MFA_CONFIG, MONGODB_CONFIG, NOTIFICATION_CONFIG, PUSH_CONFIG, REGISTRATION_CONFIG, isProd } =
    await import('../config/env')
  const { OAUTH_CONFIG } = await import('../config/auth-oauth')
  const { containerMongoFindings, containerRedisFindings } = await import('../config/container-topology')

  const findings: Finding[] = []

  push(findings, 'info', 'env_file', `Loaded ${envFile}`)
  push(findings, 'info', 'app_env', `APP_ENV=${process.env.APP_ENV ?? 'development'}`)

  if (!JWT_CONFIG.secret || JWT_CONFIG.secret === DEFAULT_JWT_SECRET) {
    push(findings, isProd ? 'error' : 'warn', 'jwt_secret', 'JWT_SECRET is empty or still the default placeholder — set a strong random value.')
  }

  if (!MONGODB_CONFIG.uri && !MONGODB_CONFIG.host) {
    push(findings, 'error', 'mongo', 'Set MONGO_URI or MONGO_HOST (+ MONGO_DB) for MongoDB.')
  }

  /**
   * Sibling-container topology (deploy inputs mongo_enabled / redis_enabled reach this step as
   * MONGO_ENABLED / REDIS_ENABLED). Inside api-service "localhost" is api-service itself: a first
   * stage deploy of a downstream project ran eight minutes and died on
   * `MONGO_URI=mongodb://localhost:27017/...`, and the first successful one shipped
   * `REDIS_URL=redis://localhost:6379` with the worker restarting in a loop. Pure logic in
   * config/container-topology.ts, covered by a unit test. Silent when the flags are not set
   * (local run, external cluster).
   */
  for (const message of containerMongoFindings({
    mongoEnabled: parseBool(process.env.MONGO_ENABLED),
    uri: MONGODB_CONFIG.uri,
    host: MONGODB_CONFIG.host,
    user: MONGODB_CONFIG.user,
    password: MONGODB_CONFIG.password,
  })) {
    push(findings, 'error', 'mongo_topology', message)
  }

  for (const message of containerRedisFindings({ redisEnabled: parseBool(process.env.REDIS_ENABLED), url: process.env.REDIS_URL })) {
    push(findings, 'error', 'redis_topology', message)
  }

  if (!MFA_CONFIG.encryptionKey?.trim()) {
    push(findings, isProd ? 'error' : 'warn', 'mfa_key', 'MFA_ENCRYPTION_KEY is empty — TOTP will not work securely.')
  } else if (MFA_CONFIG.encryptionKey.length < 16) {
    push(findings, 'warn', 'mfa_key_short', 'MFA_ENCRYPTION_KEY looks short; use a long random string.')
  }

  const registrationEmail = REGISTRATION_CONFIG.mode === 'email'

  if (registrationEmail && EMAIL_CONFIG.sendMode === 'empty') {
    push(findings, isProd ? 'error' : 'warn', 'email_signup', 'REGISTRATION_MODE=email but EMAIL_SEND_MODE=empty — sign-up codes will not be delivered.')
  }

  if (EMAIL_CONFIG.sendMode === 'elastic' && !EMAIL_CONFIG.emailApiKey?.trim()) {
    push(findings, 'error', 'email_elastic', 'EMAIL_SEND_MODE=elastic requires EMAIL_API_KEY.')
  }

  if (ACCOUNT_CONFIG.passwordChangeEnabled || ACCOUNT_CONFIG.passwordForgotEnabled) {
    if (EMAIL_CONFIG.sendMode === 'empty' && isProd) {
      push(findings, 'warn', 'password_email', 'Password change/forgot enabled but EMAIL_SEND_MODE=empty — recovery may be MFA-only or support-only.')
    }
  }

  if (ACCOUNT_CONFIG.sessionsEnabled) {
    push(findings, 'info', 'sessions', 'AUTH_SESSIONS_ENABLED=1 — access tokens are bound to refresh sessions (sid).')
  }

  if (LLM_CONFIG.enabled && !LLM_CONFIG.apiKey?.trim()) {
    push(findings, 'error', 'llm_key', 'LLM is enabled (NEXT_PUBLIC_LLM_ENABLED) but LLM_API_KEY is empty.')
  }

  const notifyPush =
    parseBool(NOTIFICATION_CONFIG.articleEnabled) ||
    parseBool(NOTIFICATION_CONFIG.mfaEnabled) ||
    parseBool(NOTIFICATION_CONFIG.loginEnabled) ||
    parseBool(NOTIFICATION_CONFIG.passwordEnabled)

  if (notifyPush) {
    const channels = [
      NOTIFICATION_CONFIG.articleChannels,
      NOTIFICATION_CONFIG.mfaChannels,
      NOTIFICATION_CONFIG.loginChannels,
      NOTIFICATION_CONFIG.passwordChannels,
    ].join(',')

    if (channels.includes('web_push') || channels.includes('all')) {
      if (!PUSH_CONFIG.publicKey?.trim() || !PUSH_CONFIG.privateKey?.trim()) {
        push(findings, 'warn', 'vapid', 'Notifications may use web_push but VAPID keys are missing.')
      }

      if (!PUSH_CONFIG.subject?.trim()) {
        push(findings, 'warn', 'vapid_subject', 'VAPID_SUBJECT is empty (e.g. mailto:you@domain.com).')
      }
    }
  }

  // Background worker (scripts/worker.ts). WORKER_ENABLED itself is a compose/CI-level
  // flag, but it usually rides in the same env file — catch inconsistencies before deploy.
  const workerEnabled = parseBool(process.env.WORKER_ENABLED)
  const workerHeartbeat = parseBool(process.env.WORKER_HEARTBEAT)

  if (workerEnabled && !process.env.REDIS_URL?.trim()) {
    push(findings, 'warn', 'worker_no_redis', 'WORKER_ENABLED=true but REDIS_URL is empty — the worker will boot as a no-op (BullMQ scheduler disabled).')
  }

  if (workerHeartbeat && !workerEnabled) {
    push(findings, 'info', 'worker_heartbeat_only', 'WORKER_HEARTBEAT=true but WORKER_ENABLED is off — the flag only matters inside the worker container.')
  }

  if (workerEnabled && !workerHeartbeat) {
    push(
      findings,
      'info',
      'worker_no_jobs_hint',
      'WORKER_ENABLED=true with WORKER_HEARTBEAT off — make sure scripts/worker.ts has project jobs enabled, otherwise the worker idles ("no jobs registered").',
    )
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  if (isProd && siteUrl.startsWith('http://')) {
    push(findings, 'warn', 'site_url_http', 'NEXT_PUBLIC_SITE_URL uses http in production — prefer https for SEO and cookies.')
  }

  if (!process.env.FIRST_ADMIN_LOGIN?.trim() && !process.env.FIRST_ADMIN_PASSWORD?.trim()) {
    push(findings, 'info', 'first_admin', 'FIRST_ADMIN_LOGIN/PASSWORD unset — create an admin via seed or DB manually.')
  }

  const oauthContexts = [
    { name: 'signIn', list: OAUTH_CONFIG.signInProviders },
    { name: 'signUp', list: OAUTH_CONFIG.signUpProviders },
    { name: 'link', list: OAUTH_CONFIG.linkProviders },
  ] as const

  for (const ctx of oauthContexts) {
    for (const provider of ctx.list) {
      if (!OAUTH_CONFIG.isProviderEnabled(provider)) {
        push(
          findings,
          'error',
          `oauth_${ctx.name}_${provider}`,
          `Provider "${provider}" is listed in AUTH_OAUTH_${ctx.name.toUpperCase()}_PROVIDERS but AUTH_OAUTH_${provider.toUpperCase()}_ENABLED is off.`,
        )
      } else if (!OAUTH_CONFIG.isProviderConfigured(provider)) {
        push(findings, 'error', `oauth_${ctx.name}_${provider}_creds`, `Provider "${provider}" is enabled for ${ctx.name} but client id/secret is missing.`)
      }
    }
  }

  const configuredSignIn = OAUTH_CONFIG.getProvidersForContext('signIn')

  if (OAUTH_CONFIG.uiMode === 'oauth_only' && configuredSignIn.length === 0) {
    push(findings, 'error', 'oauth_only_empty', 'AUTH_UI_MODE=oauth_only but no sign-in OAuth providers are configured.')
  }

  if (OAUTH_CONFIG.uiMode === 'credentials_only' && configuredSignIn.length > 0) {
    push(findings, 'warn', 'oauth_credentials_only', 'AUTH_UI_MODE=credentials_only but sign-in OAuth providers are configured — buttons will stay hidden.')
  }

  if (configuredSignIn.length > 0) {
    push(findings, 'info', 'oauth_sign_in', `OAuth sign-in providers: ${configuredSignIn.join(', ')}`)
  }

  push(findings, 'info', 'product_config', 'Customize branding in config/product.ts (name, author, PWA, sitemap extras).')

  const errors = findings.filter((f) => f.level === 'error')
  const warnings = findings.filter((f) => f.level === 'warn')

  for (const f of findings) {
    const prefix = f.level === 'error' ? '✖' : f.level === 'warn' ? '⚠' : 'ℹ'
    console.info(`${prefix} [${f.code}] ${f.message}`)
  }

  console.info('')
  console.info(`Summary: ${errors.length} error(s), ${warnings.length} warning(s), ${findings.length - errors.length - warnings.length} info`)

  if (errors.length > 0) {
    process.exit(1)
  }
}

main().catch((error: unknown) => {
  console.error('[doctor] Failed:', error)
  process.exit(1)
})
