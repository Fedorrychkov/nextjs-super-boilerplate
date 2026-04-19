import { EMAIL_CONFIG } from '@config/env'

import { Logger } from '~/utils/logger'

import type { EmailProvider, TransactionalEmailMessage } from './email-provider.types'
import { ConsoleEmailProvider } from './providers/console-email.provider'
import { ElasticEmailProvider } from './providers/elastic-email.provider'

const logger = new Logger(['EmailService', '[lib/services/email/email.service.ts]'])

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
  async sendTransactional(message: TransactionalEmailMessage): Promise<void> {
    const mode = EMAIL_CONFIG.sendMode

    if (mode === 'console') {
      await new ConsoleEmailProvider().send(message)

      return
    }

    if (mode === 'elastic') {
      try {
        await new ElasticEmailProvider().send(message)
      } catch (error) {
        logger.error('Elastic Email failed', { error: (error as Error)?.message, to: message.to })

        throw error
      }

      return
    }

    try {
      await this.provider.send(message)
    } catch (error) {
      logger.error('Email provider failed', { error: (error as Error)?.message, to: message.to })

      throw error
    }
  }
}

export const emailService = new EmailService()
