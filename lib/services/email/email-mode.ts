/**
 * The mail layer has exactly three modes. `elastic` is the only transport that delivers;
 * `console` logs the message (a legitimate dev/stage mode — OTP codes are read from the log);
 * `empty` means mail is off. Anything else is a typo, and a typo used to fall through to the
 * console provider and report "skipped" as if that were fine — the user was told "code sent".
 * Pure so the doctor, the service and the OTP flows share one rule and it can be unit-tested.
 */
export const EMAIL_SEND_MODES = ['console', 'elastic', 'empty'] as const

export type EmailSendMode = (typeof EMAIL_SEND_MODES)[number]

/** `null` — not a known mode. */
export function resolveEmailSendMode(raw: string | null | undefined): EmailSendMode | null {
  const mode = raw?.trim().toLowerCase() ?? ''

  if (!mode) return 'empty'

  return (EMAIL_SEND_MODES as readonly string[]).includes(mode) ? (mode as EmailSendMode) : null
}

/** A real transport can deliver: elastic with an API key. Console and empty never deliver. */
export function isEmailDeliverable(raw: string | null | undefined, apiKey: string | null | undefined): boolean {
  return resolveEmailSendMode(raw) === 'elastic' && Boolean(apiKey?.trim())
}

export type EmailSendResult = { sent: true } | { sent: false; skipped: true; reason: string } | { sent: false; skipped: false; error: string }

/**
 * OTP flows (sign-up code, password recovery code) accept a console "send": the code is in the
 * log and, in development, in `devCode`. Empty, unknown and failed sends are NOT accepted — the
 * user would be asked for a code nobody delivered.
 */
export function isOtpEmailAccepted(result: EmailSendResult): boolean {
  if (result.sent) return true

  return 'skipped' in result && result.skipped && result.reason === 'email_send_console'
}
