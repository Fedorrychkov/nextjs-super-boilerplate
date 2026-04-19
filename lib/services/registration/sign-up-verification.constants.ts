/** Redis TTL for pending signup (code + password hash). */
export const PENDING_SIGNUP_TTL_SEC = 30 * 60

/** Max code send requests per email per hour (new code invalidates previous). */
export const SEND_CODE_MAX_PER_EMAIL_PER_HOUR = 5

/** Max wrong code attempts before 1h lockout for that email. */
export const VERIFY_WRONG_ATTEMPTS_MAX = 10

/** Cooldown after too many wrong codes (seconds). */
export const VERIFY_LOCKOUT_SEC = 60 * 60

/** Window for counting send attempts (seconds). */
export const SEND_WINDOW_SEC = 60 * 60

export const REDIS_PREFIX = 'signup:'
