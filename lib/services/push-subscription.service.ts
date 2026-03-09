import connectDB from '@lib/db/client'
import PushSubscription, { IPushSubscription } from '@lib/db/models/PushSubscription'

export type PushSubscribeDto = {
  endpoint: string
  keys: { p256dh: string; auth: string }
  userAgent?: string
}

export class PushSubscriptionService {
  async checkSubscription(userId: string, endpoint: string): Promise<IPushSubscription | null> {
    await connectDB()

    const existing = await PushSubscription.findOne({ userId, endpoint }).exec()

    return existing
  }

  async subscribe(userId: string, dto: PushSubscribeDto): Promise<IPushSubscription> {
    await connectDB()

    const existing = await PushSubscription.findOne({ userId, endpoint: dto.endpoint }).exec()

    if (existing) {
      return existing
    }

    const created = await PushSubscription.create({
      userId,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
      userAgent: dto.userAgent ?? null,
    })

    return created
  }

  async unsubscribe(userId: string, endpoint: string): Promise<void> {
    await connectDB()

    await PushSubscription.deleteOne({ userId, endpoint }).exec()
  }
  async list(filter: { userId?: string; endpoint?: string }): Promise<IPushSubscription[]> {
    await connectDB()

    const query: Record<string, string> = {}

    if (filter.userId) query.userId = filter.userId

    if (filter.endpoint) query.endpoint = filter.endpoint

    const list = await PushSubscription.find(query).exec()

    return list
  }
}

export const pushSubscriptionService = new PushSubscriptionService()
