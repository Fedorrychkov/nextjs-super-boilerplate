import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { RumDashboardPayload } from '../types'

export class ClientRumApi {
  private readonly client: AxiosInstance

  constructor(origin?: string, options?: { headers?: Record<string, string> }) {
    const config = origin ? { baseURL: origin, ...(options?.headers && { headers: options.headers }) } : undefined
    this.client = new Request(config).apiClient
  }

  async getDashboard(days: number): Promise<RumDashboardPayload> {
    const response = await this.client.get<RumDashboardPayload>('/api/v1/rum/dashboard', {
      params: { days },
    })

    return response.data
  }
}
