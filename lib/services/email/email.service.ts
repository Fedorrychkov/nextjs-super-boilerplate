import { EMAIL_CONFIG } from '@config/env'

import { Logger } from '~/utils/logger'

import { type EmailSendResult, isEmailDeliverable, resolveEmailSendMode } from './email-mode'
import type { TransactionalEmailMessage } from './email-provider.types'
import { ConsoleEmailProvider } from './providers/console-email.provider'
import { ElasticEmailProvider } from './providers/elastic-email.provider'

const logger = new Logger(['EmailService', '[lib/services/email/email.service.ts]'])

export type NotificationEmailPayload = {
  to: string
  subject: string
  text: string
  html?: string
}

export type NotificationEmailResult = EmailSendResult

/** Outbound mail is configured (Elastic API with a key). Console-only mode does not count for notification delivery. */
export function isTransactionalEmailEnabled(): boolean {
  return isEmailDeliverable(EMAIL_CONFIG.sendMode, EMAIL_CONFIG.emailApiKey)
}

/**
 * Facade for transactional mail. Modes are resolved explicitly (`email-mode.ts`): the old code
 * matched `console` and `elastic` and sent EVERYTHING else — the `empty` default and any typo —
 * through a fallback console provider while reporting "skipped", which callers read as fine.
 */
class EmailService {
  /**
   * Never throws for a configuration state: `console` / `empty` / unknown come back as `skipped`
   * with a reason, and the caller decides what that means for its flow (`isOtpEmailAccepted`).
   * A transport failure (Elastic refused) throws, as before.
   */
  async sendTransactional(message: TransactionalEmailMessage): Promise<NotificationEmailResult> {
    const mode = resolveEmailSendMode(EMAIL_CONFIG.sendMode)

    if (mode === 'console') {
      await new ConsoleEmailProvider().send(message)

      return { sent: false, skipped: true, reason: 'email_send_console' }
    }

    if (mode === 'empty') {
      return { sent: false, skipped: true, reason: 'email_not_configured' }
    }

    if (mode === null) {
      // The old fallback lived here: an unknown mode logged the message and reported skipped.
      logger.error('EMAIL_SEND_MODE is not a supported mode (console | elastic | empty) — mail is not delivered', {
        mode: EMAIL_CONFIG.sendMode,
        to: message.to,
      })

      return { sent: false, skipped: true, reason: 'email_mode_unknown' }
    }

    try {
      await new ElasticEmailProvider().send(message)

      return { sent: true }
    } catch (error) {
      logger.error('Elastic Email failed', { error: (error as Error)?.message, to: message.to })

      throw error
    }
  }

  /** Notification channel: skips silently when mail is not configured. */
  async sendNotificationEmail(payload: NotificationEmailPayload): Promise<NotificationEmailResult> {
    if (!isTransactionalEmailEnabled()) {
      return { sent: false, skipped: true, reason: 'email_not_configured' }
    }

    try {
      const result = await this.sendTransactional({
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      })

      return result
    } catch (error) {
      const message = (error as Error)?.message ?? 'email_send_failed'

      logger.error('Notification email failed', { error: message, to: payload.to })

      return { sent: false, skipped: false, error: message.slice(0, 500) }
    }
  }
}

export const emailService = new EmailService()
