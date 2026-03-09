import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { AnyString } from '~/types'

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
}
