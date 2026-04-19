import { EMAIL_CONFIG } from '@config/env'
import axios, { type AxiosInstance } from 'axios'

import { Logger } from '~/utils/logger'

import type { EmailProvider, TransactionalEmailMessage } from '../email-provider.types'

const logger = new Logger(['ElasticEmailProvider', '[lib/services/email/providers/elastic-email.provider.ts]'])

function stringifyMergeFields(fields: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}

  for (const [k, v] of Object.entries(fields)) {
    out[k] = String(v)
  }

  return out
}

/**
 * Elastic Email REST API v4. Supports:
 * - template sends (`message.template`) — body comes from the dashboard; merge fields e.g. `{code}` → `code`
 * - raw body (`text` / `html`) — uptime and other non-template mail
 */
export class ElasticEmailProvider implements EmailProvider {
  private readonly client: AxiosInstance

  constructor() {
    const apiKey = EMAIL_CONFIG.emailApiKey

    if (!apiKey) {
      logger.warn('EMAIL_API_KEY is empty — Elastic Email requests will fail.')
    }

    this.client = axios.create({
      baseURL: 'https://api.elasticemail.com/v4',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-ElasticEmail-ApiKey': apiKey } : {}),
      },
      validateStatus: (s) => s >= 200 && s < 300,
    })
  }

  async send(message: TransactionalEmailMessage): Promise<void> {
    if (!EMAIL_CONFIG.emailApiKey) {
      throw new Error('EMAIL_API_KEY is not configured')
    }

    const from = EMAIL_CONFIG.from

    if (!from) {
      throw new Error('EMAIL_FROM is not configured')
    }

    if (message.template?.name) {
      await this.sendWithTemplate(message, from)

      return
    }

    await this.sendWithBody(message, from)
  }

  private async sendWithTemplate(message: TransactionalEmailMessage, from: string): Promise<void> {
    const name = message.template?.name

    if (!name) {
      throw new Error('Template name is required')
    }

    /** String values only — Elastic merge fields are strings in API samples. */
    const merge = stringifyMergeFields(message.template?.mergeFields ?? {})

    const replyTo = EMAIL_CONFIG.replyTo

    /**
     * Use transactional endpoint, not `POST /emails` (bulk merge). Wrong endpoint often yields generic 400 + ErrorData UUID.
     * @see https://elasticemail.com/developers/api-documentation/rest-api — Send Transactional Email
     */
    const payload = {
      Recipients: {
        To: [message.to],
      },
      Content: {
        TemplateName: name,
        Subject: message.subject,
        EnvelopeFrom: from,
        From: from,
        ...(replyTo ? { ReplyTo: replyTo } : {}),
        Merge: merge,
      },
      Options: {
        TrackOpens: true,
        TrackClicks: true,
      },
    }

    await this.postEmails(payload, 'template', '/emails/transactional')
  }

  private async sendWithBody(message: TransactionalEmailMessage, from: string): Promise<void> {
    const replyTo = EMAIL_CONFIG.replyTo
    const html = message.html?.trim()
    const content = html && html.length > 0 ? this.cleanHtmlContent(html) : message.text
    const contentType = html && html.length > 0 ? 'HTML' : 'PlainText'
    const textAlt = contentType === 'HTML' ? this.htmlToText(content) : content

    const payload = {
      Recipients: {
        To: [message.to],
      },
      Content: {
        Body: [
          {
            ContentType: contentType,
            Charset: 'utf-8',
            Content: content,
          },
          ...(contentType === 'HTML'
            ? [
                {
                  ContentType: 'PlainText',
                  Charset: 'utf-8',
                  Content: textAlt,
                },
              ]
            : []),
        ],
        Subject: message.subject,
        EnvelopeFrom: from,
        From: from,
        ...(replyTo ? { ReplyTo: replyTo } : {}),
      },
      Options: {
        TrackOpens: true,
        TrackClicks: true,
      },
    }

    await this.postEmails(payload, 'body', '/emails/transactional')
  }

  private async postEmails(payload: unknown, kind: 'template' | 'body', path = '/emails'): Promise<void> {
    try {
      const response = await this.client.post<{ TransactionID?: string; MessageID?: string }>(path, payload)

      logger.info('Elastic Email sent', {
        kind,
        path,
        status: response.status,
        transactionId: response.data?.TransactionID,
        messageId: response.data?.MessageID,
      })

      if (!response.data?.TransactionID) {
        logger.warn('Elastic Email response missing TransactionID', { data: response.data })
      }
    } catch (error: unknown) {
      const ax = error as { response?: { data?: unknown; status?: number } }

      logger.error('Elastic Email request failed', {
        kind,
        path,
        status: ax.response?.status,
        data: ax.response?.data,
        message: error instanceof Error ? error.message : String(error),
      })

      throw new Error('Elastic Email send failed')
    }
  }

  private htmlToText(html: string): string {
    let s = html.replace(/<[^>]*>/g, '')
    s = s.replace(/&nbsp;/g, ' ')
    s = s.replace(/&amp;/g, '&')
    s = s.replace(/&lt;/g, '<')
    s = s.replace(/&gt;/g, '>')
    s = s.replace(/&quot;/g, '"')
    s = s.replace(/&#39;/g, '\u0027')
    s = s.replace(/\s+/g, ' ')

    return s.trim()
  }

  private cleanHtmlContent(html: string): string {
    return html.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim()
  }
}
