import { isProd, JWT_CONFIG } from '@config/env'

import { isMissingOrDefaultJwtSecret, isShortJwtSecret, RECOMMENDED_JWT_SECRET_LENGTH } from '~/lib/security/jwtSecret'

/**
 * Runs once per server process before any request. The doctor in the deploy applies the same
 * rules earlier; this is the last line for a deploy that skipped it. Only the default/empty secret
 * stops the process — that is no signature at all. A short secret is a warning: existing
 * deployments run with them, and refusing to start would be an outage, not a fix.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  if (isProd && isMissingOrDefaultJwtSecret(JWT_CONFIG.secret)) {
    throw new Error('JWT_SECRET is empty or the repository default — refusing to start in production')
  }

  if (isShortJwtSecret(JWT_CONFIG.secret)) {
    console.warn(`[instrumentation] JWT_SECRET is shorter than ${RECOMMENDED_JWT_SECRET_LENGTH} characters — rotate when convenient (make setup generates 64)`)
  }
}
