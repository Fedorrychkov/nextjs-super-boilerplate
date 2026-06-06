import { Request } from '@lib/request'
import type { AxiosInstance } from 'axios'

import type { PlatformNotificationFilter, PlatformNotificationListResponse } from '../types'

export class ClientNotificationApi {
  private readonly client: AxiosInstance

  constructor() {
    this.client = new Request().apiClient
  }

  async listMine(params?: Partial<PlatformNotificationFilter>): Promise<PlatformNotificationListResponse> {
    const response = await this.client.get('/api/v1/notification/list', { params: sanitizeNotificationParams(params) })

    return response.data
  }

  async listAdmin(params?: Partial<PlatformNotificationFilter>): Promise<PlatformNotificationListResponse> {
    const response = await this.client.get('/api/v1/notification/admin/list', { params: sanitizeNotificationParams(params) })

    return response.data
  }
}

function sanitizeNotificationParams(params?: Partial<PlatformNotificationFilter>): Record<string, string | number | undefined> {
  if (!params) {
    return {}
  }

  const entries = Object.entries(params).filter(([, value]) => value != null && value !== '')

  return Object.fromEntries(entries.map(([key, value]) => [key, typeof value === 'number' ? value : String(value)]))
}
