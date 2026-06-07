import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { PushSubscriptionPublicItemModel } from '~/api/user'
import { AnyString } from '~/types'

/**
 * Push Subscriptions
 */
export class ClientSubscriptionApi {
  private readonly client: AxiosInstance

  constructor() {
    this.client = new Request().apiClient
  }

  subscribe(dto: { subscription: PushSubscription }): Promise<void> {
    return this.client.post('/api/v1/push/subscribe', dto)
  }

  unsubscribe(dto: { endpoint: string }): Promise<void> {
    return this.client.delete('/api/v1/push/subscribe', { data: dto })
  }

  async status(params: { endpoint: string }): Promise<{ ok: boolean; subscribed: boolean }> {
    const response = await this.client.get('/api/v1/push/subscribe', { params })

    return response.data
  }

  async test(dto: { type: 'test' | AnyString }): Promise<{ ok: boolean }> {
    return this.client.post('/api/v1/push/send', dto)
  }

  async listSubscriptions(currentEndpoint?: string | null): Promise<{ list: PushSubscriptionPublicItemModel[] }> {
    const headers = currentEndpoint ? { 'X-Push-Subscription-Endpoint': currentEndpoint } : undefined
    const response = await this.client.get('/api/v1/push/subscriptions', { headers })

    return response.data
  }

  async deleteSubscription(dto: { id: string }): Promise<void> {
    await this.client.delete('/api/v1/push/subscriptions', { data: dto })
  }
}
