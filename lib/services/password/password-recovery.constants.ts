/** Redis TTL for pending password change / forgot sessions. */
export const PENDING_PASSWORD_TTL_SEC = 30 * 60

export const SEND_CODE_MAX_PER_EMAIL_PER_HOUR = 5
export const VERIFY_WRONG_ATTEMPTS_MAX = 10
export const VERIFY_LOCKOUT_SEC = 60 * 60
export const SEND_WINDOW_SEC = 60 * 60

export const REDIS_PREFIX = 'pwd-recovery:'
