import { Logger } from '~/utils/logger'

import type { EmailProvider, TransactionalEmailMessage } from '../email-provider.types'

const logger = new Logger(['ConsoleEmailProvider', '[lib/services/email/providers/console-email.provider.ts]'])

function safeMergeForLog(mergeFields?: Record<string, string>): Record<string, string> | undefined {
  if (!mergeFields) return undefined

  const out: Record<string, string> = { ...mergeFields }

  if (out.code) out.code = '******'

  return out
}

/** Dev / fallback: no external provider; logs payload (OTP masked when `template.mergeFields.code` is used). */
export class ConsoleEmailProvider implements EmailProvider {
  async send(message: TransactionalEmailMessage): Promise<void> {
    logger.info('Transactional email (console)', {
      to: message.to,
      subject: message.subject,
      templateName: message.template?.name,
      mergeFields: safeMergeForLog(message.template?.mergeFields),
      textPreview: message.text.slice(0, 200),
    })
  }
}
