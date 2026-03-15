import { PUSH_CONFIG } from '@config/env'
import * as webpush from 'web-push'

import { AnyString } from '~/types'
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

  async sendToUser(userId: string, payload: WebPushPayload) {
    const subscriptions = await pushSubscriptionService.list({ userId })

    if (!subscriptions?.length) return { ok: false, count: 0 }

    const results = await Promise.all(
      subscriptions.map(async (s) => {
        const sub: webpush.PushSubscription = {
          endpoint: s.endpoint,
          keys: { p256dh: s.p256dh, auth: s.auth },
        }

        try {
          await webpush.sendNotification(sub, JSON.stringify(payload))

          return { ok: true }
        } catch (err: any) {
          const statusCode = err?.statusCode

          if (statusCode === 404 || statusCode === 410) {
            this.logger.warn(`Removing dead subscription for user ${userId}`)
            await pushSubscriptionService.unsubscribe(userId, s.endpoint)

            return { ok: false, removed: true }
          }
          this.logger.error('WebPush error', err)

          return { ok: false }
        }
      }),
    )

    return results.filter((r) => r.ok).length
  }
}

export const webPushService = new WebPushService()
