export const DEFAULT_JWT_SECRET = 'your-secret-key-change'

/** Recommended minimum in characters; `make setup` generates 64 hex characters. */
export const RECOMMENDED_JWT_SECRET_LENGTH = 32

/**
 * Empty or the repository default is not a weak signature — it is no signature: the default is
 * public, and anyone who read the source can mint an admin token. This is the only condition
 * that stops anything (doctor error in production, refusal to start in production).
 */
export function isMissingOrDefaultJwtSecret(secret: string | null | undefined): boolean {
  return !secret || secret === DEFAULT_JWT_SECRET
}

/**
 * Shorter than recommended. A warning only — existing deployments run with shorter secrets, and
 * a rule that stops their deploys would trade a theoretical weakness for a real outage.
 */
export function isShortJwtSecret(secret: string | null | undefined): boolean {
  return Boolean(secret) && secret!.length < RECOMMENDED_JWT_SECRET_LENGTH
}
