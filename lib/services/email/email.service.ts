import { EMAIL_CONFIG } from '@config/env'

import { Logger } from '~/utils/logger'

import type { EmailProvider, TransactionalEmailMessage } from './email-provider.types'
import { ConsoleEmailProvider } from './providers/console-email.provider'
import { ElasticEmailProvider } from './providers/elastic-email.provider'

const logger = new Logger(['EmailService', '[lib/services/email/email.service.ts]'])

export type NotificationEmailPayload = {
  to: string
  subject: string
  text: string
  html?: string
}

export type NotificationEmailResult = { sent: true } | { sent: false; skipped: true; reason: string } | { sent: false; skipped: false; error: string }

/** Outbound mail is configured (Elastic API). Console-only mode does not count for notification delivery. */
export function isTransactionalEmailEnabled(): boolean {
  const { sendMode, emailApiKey } = EMAIL_CONFIG

  if (sendMode === 'elastic') {
    return Boolean(emailApiKey?.trim())
  }

  return sendMode !== 'console'
}

/**
 * Facade for transactional mail. Inject a real provider (Nodemailer, Resend, …) later.
 * `EMAIL_SEND_MODE=console` keeps registration working without SMTP.
 */
class EmailService {
  private provider: EmailProvider = new ConsoleEmailProvider()

  setProvider(provider: EmailProvider): void {
    this.provider = provider
  }

  getProvider(): EmailProvider {
    return this.provider
  }

  /** Sends via configured provider; on failure throws (caller maps to user-facing support error). */
  async sendTransactional(message: TransactionalEmailMessage): Promise<NotificationEmailResult> {
    const mode = EMAIL_CONFIG.sendMode

    if (mode === 'console') {
      await new ConsoleEmailProvider().send(message)

      return { sent: false, skipped: true, reason: 'email_send_console' }
    }

    if (mode === 'elastic') {
      try {
        await new ElasticEmailProvider().send(message)

        return { sent: true }
      } catch (error) {
        logger.error('Elastic Email failed', { error: (error as Error)?.message, to: message.to })

        throw error
      }
    }

    try {
      await this.provider.send(message)

      if (this.provider instanceof ConsoleEmailProvider) {
        return { sent: false, skipped: true, reason: 'email_send_console' }
      }

      return { sent: true }
    } catch (error) {
      logger.error('Email provider failed', { error: (error as Error)?.message, to: message.to })

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
