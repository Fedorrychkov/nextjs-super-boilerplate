import { NEXT_PUBLIC_SITE_URL, PUSH_CONFIG } from '@config/env'
import * as webpush from 'web-push'

import { AnyString } from '~/types'
import { jsonStringifySafety } from '~/utils/jsonSafe'
import { Logger } from '~/utils/logger'

import { pushSubscriptionService } from './push-subscription.service'

type WebPushPayload = {
  type: 'test' | AnyString
  title: string
  body: string
  url: string
  icon?: string
  badge?: string
  tag?: string
  dedupId?: string
  ts?: number
}

export type WebPushDeliveryError = {
  endpoint: string
  provider: 'apple' | 'fcm' | 'mozilla' | 'other'
  statusCode?: number
  message: string
  removed: boolean
}

export type WebPushSendResult = {
  hadSubscriptions: boolean
  deliveredCount: number
  failedCount: number
  errors: WebPushDeliveryError[]
}

const DEAD_SUBSCRIPTION_STATUS_CODES = new Set([400, 401, 403, 404, 410, 413])

const DEFAULT_PUSH_ICON_PATH = '/images/web-app-manifest-192x192.png'

function buildPushIconUrl(icon?: string): string {
  if (icon?.startsWith('http')) {
    return icon
  }

  const base = NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  const path = icon?.startsWith('/') ? icon : DEFAULT_PUSH_ICON_PATH

  return `${base}${path}`
}

function normalizePushPayload(payload: WebPushPayload): WebPushPayload {
  const body = payload.body?.trim() || payload.title?.trim() || 'Notification'

  return {
    ...payload,
    title: payload.title?.trim() || 'Notification',
    body,
    icon: buildPushIconUrl(payload.icon),
  }
}

export function detectPushProvider(endpoint: string): WebPushDeliveryError['provider'] {
  if (endpoint.includes('web.push.apple.com')) {
    return 'apple'
  }

  if (endpoint.includes('fcm.googleapis.com') || endpoint.includes('googleapis.com/gcm')) {
    return 'fcm'
  }

  if (endpoint.includes('mozilla.com')) {
    return 'mozilla'
  }

  return 'other'
}

function formatPushError(err: unknown): { statusCode?: number; message: string } {
  if (err && typeof err === 'object') {
    const record = err as { statusCode?: number; message?: string; body?: string }

    const statusCode = typeof record.statusCode === 'number' ? record.statusCode : undefined
    const message = [record.message, record.body].filter(Boolean).join(' — ') || 'unknown'

    return { statusCode, message }
  }

  if (err instanceof Error) {
    return { message: err.message }
  }

  return { message: String(err) }
}

export class WebPushService {
  private readonly logger = new Logger(['WebPushService', '[lib/services/web-push.service.ts]'])

  constructor() {
    const publicKey = PUSH_CONFIG.publicKey
    const privateKey = PUSH_CONFIG.privateKey
    const subject = PUSH_CONFIG.subject || 'mailto:notify@example.com'

    if (!publicKey || !privateKey) {
      this.logger.warn('VAPID keys are not set. Web Push will not work until configured.')
    } else {
      webpush.setVapidDetails(subject, publicKey, privateKey)
    }
  }

  async sendToUser(userId: string, payload: WebPushPayload): Promise<WebPushSendResult> {
    const subscriptions = await pushSubscriptionService.list({ userId })

    if (!subscriptions?.length) {
      return { hadSubscriptions: false, deliveredCount: 0, failedCount: 0, errors: [] }
    }

    const payloadJson = jsonStringifySafety(normalizePushPayload(payload))
    const errors: WebPushDeliveryError[] = []

    const results = await Promise.all(
      subscriptions.map(async (s) => {
        const provider = detectPushProvider(s.endpoint)
        const sub: webpush.PushSubscription = {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        }

        try {
          await webpush.sendNotification(sub, payloadJson, {
            TTL: 60 * 60 * 24,
            urgency: 'high',
          })

          return { ok: true as const }
        } catch (err: unknown) {
          const { statusCode, message } = formatPushError(err)
          let removed = false

          if (statusCode != null && DEAD_SUBSCRIPTION_STATUS_CODES.has(statusCode)) {
            this.logger.warn(`Removing dead push subscription for user ${userId}`, {
              provider,
              statusCode,
              endpoint: s.endpoint.slice(0, 80),
            })
            await pushSubscriptionService.unsubscribe(userId, s.endpoint)
            removed = true
          } else {
            this.logger.error('WebPush error', {
              provider,
              statusCode,
              message,
              endpoint: s.endpoint.slice(0, 80),
            })
          }

          errors.push({
            endpoint: s.endpoint,
            provider,
            statusCode,
            message,
            removed,
          })

          return { ok: false as const }
        }
      }),
    )

    const deliveredCount = results.filter((r) => r.ok).length

    return {
      hadSubscriptions: true,
      deliveredCount,
      failedCount: results.length - deliveredCount,
      errors,
    }
  }
}

export const webPushService = new WebPushService()

export function summarizeWebPushErrors(errors: WebPushDeliveryError[]): string {
  if (errors.length === 0) {
    return 'web_push_delivery_failed'
  }

  return errors
    .map((e) => {
      const code = e.statusCode != null ? String(e.statusCode) : 'err'

      return `${e.provider}:${code}${e.removed ? ':removed' : ''}`
    })
    .join(';')
    .slice(0, 500)
}
