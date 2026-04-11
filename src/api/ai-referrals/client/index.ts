import { Request } from '@lib/request'
import { AxiosInstance } from 'axios'

import { AiReferralDashboardPayload, AiReferralPathnameQueryStatsPayload, AiReferralPathnameVisitsPage, AiRefferralFilter } from '../types'

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

  async getPathnameVisits(params: { pathname: string; days: number; cursor?: string | null; limit?: number }): Promise<AiReferralPathnameVisitsPage> {
    const response = await this.client.get<AiReferralPathnameVisitsPage>('/api/v1/ai-referrals/pathname-visits', {
      params: {
        days: params.days,
        pathname: params.pathname,
        cursor: params.cursor || undefined,
        limit: params.limit,
      },
    })

    return response.data
  }

  async getPathnameQueryStats(params: { pathname: string; days: number }): Promise<AiReferralPathnameQueryStatsPayload> {
    const response = await this.client.get<AiReferralPathnameQueryStatsPayload>('/api/v1/ai-referrals/pathname-query-stats', {
      params: {
        days: params.days,
        pathname: params.pathname,
      },
    })

    return response.data
  }
}
