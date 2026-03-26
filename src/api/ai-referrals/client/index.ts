import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { AiReferralDashboardPayload, AiRefferralFilter } from '../types'

export class ClientAiReferralsApi {
  private readonly client: AxiosInstance

  constructor(origin?: string, options?: { headers?: Record<string, string> }) {
    const config = origin ? { baseURL: origin, ...(options?.headers && { headers: options.headers }) } : undefined
    this.client = new Request(config).apiClient
  }

  async getDashboard(filter: AiRefferralFilter): Promise<AiReferralDashboardPayload> {
    const response = await this.client.get<AiReferralDashboardPayload>('/api/v1/ai-referrals/dashboard', {
      params: { days: filter.days, pathname: filter.pathname, source: filter.source },
    })

    return response.data
  }
}
